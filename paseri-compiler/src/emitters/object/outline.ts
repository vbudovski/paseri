// Structural split: nested object validation is outlined into hoisted `_objectIssuesN` helpers rather than
// inlined into the parent body. Inlined bodies grow with total schema size, and V8 never promotes a function
// whose bytecode exceeds `max_optimized_bytecode_size` (60 KB default) past Maglev — wide schemas hit that gate
// on the full-validation path. Structurally-identical nested objects share one helper via normalized-body dedup.
import type { IR } from '@paseri/paseri/introspect';
import ts from 'typescript';
import {
    call,
    constStatement,
    ifStatement,
    letStatement,
    notEquals,
    returnStatement,
    typeReference,
    typeUnion,
    undefinedExpression,
    undefinedType,
    unknownType,
} from '../../builders.ts';
import { emitFailureRouting, emitSuccessRouting } from '../../issues.ts';
import { type AccumulateSink, freshIdentifier, type Sink, type State } from '../../state.ts';
import type { ObjectIR } from './common.ts';
import { emitObjectInline } from './index.ts';
import { normalizeShapeHelper } from './shape.ts';

const { factory } = ts;
const numberType = factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);

/**
 * Whether the subtree contains a `ref` node — its emitted validation then references the in-scope depth
 * expression and `maxDepth` identifier, so an outlined helper must thread `(depth, maxDepth)` parameters.
 * Refs are leaves here; their targets emit inside the helper's scoped depth.
 */
function subtreeHasRef(ir: IR): boolean {
    switch (ir.kind) {
        case 'ref':
            return true;
        case 'object':
            return Object.values(ir.fields).some(subtreeHasRef);
        case 'array':
        case 'set':
        case 'record':
            return subtreeHasRef(ir.element);
        case 'map':
            return subtreeHasRef(ir.key) || subtreeHasRef(ir.value);
        case 'tuple':
            return ir.elements.some(subtreeHasRef);
        case 'union':
            return ir.members.some(subtreeHasRef);
        case 'optional':
        case 'nullable':
        case 'refine':
            return subtreeHasRef(ir.inner);
        case 'default':
            return subtreeHasRef(ir.inner);
        case 'chain':
            return subtreeHasRef(ir.from) || subtreeHasRef(ir.to);
        default:
            return false;
    }
}

/**
 * Returns the hoisted issues-helper for `ir`, generating it on first use. The helper runs the exact statements
 * the inline emit would have placed at the use site (including the `isPlainObject` gate) against a root
 * accumulator and returns the issue tree, or `undefined` on a clean pass. Deduplicated by normalized body.
 * Returns `undefined` only when depth threading is needed but no `maxDepth` is in scope (unreachable: refs
 * imply the entry threads depth).
 */
function getOrCreateObjectIssuesHelper(ir: ObjectIR, threadsDepth: boolean, state: State): ts.Identifier | undefined {
    if (threadsDepth && state.maxDepthIdentifier === undefined) {
        return undefined;
    }
    const valueParameter = freshIdentifier(state, 'val');
    const issueIdentifier = freshIdentifier(state, 'issue');
    const helperSink: AccumulateSink = { kind: 'accumulate', issueIdentifier, keyExpression: undefined };

    const parameters: ts.ParameterDeclaration[] = [
        factory.createParameterDeclaration(undefined, undefined, valueParameter, undefined, unknownType),
    ];
    let bodyStatements: ts.Statement[];
    if (threadsDepth) {
        const depthParameter = freshIdentifier(state, 'depth');
        const maxDepthParameter = freshIdentifier(state, 'maxDepth');
        parameters.push(
            factory.createParameterDeclaration(undefined, undefined, depthParameter, undefined, numberType),
            factory.createParameterDeclaration(undefined, undefined, maxDepthParameter, undefined, numberType),
        );
        // The helper is a transparent extraction of the use site, not a lazy boundary: the caller's depth passes
        // through verbatim and any `+ 1` happens at ref boundaries inside, mirroring the inline emit's accounting.
        const savedDepth = state.currentDepth;
        const savedMaxDepth = state.maxDepthIdentifier;
        state.currentDepth = depthParameter;
        state.maxDepthIdentifier = maxDepthParameter;
        bodyStatements = emitObjectInline(ir, valueParameter, helperSink, state);
        state.currentDepth = savedDepth;
        state.maxDepthIdentifier = savedMaxDepth;
    } else {
        bodyStatements = emitObjectInline(ir, valueParameter, helperSink, state);
    }

    const helperName = freshIdentifier(state, 'objectIssues');
    const helperFunction = factory.createFunctionDeclaration(
        undefined,
        undefined,
        helperName,
        undefined,
        parameters,
        typeUnion([typeReference('TreeNode'), undefinedType]),
        factory.createBlock(
            [
                letStatement(issueIdentifier, typeUnion([typeReference('TreeNode'), undefinedType])),
                ...bodyStatements,
                returnStatement(issueIdentifier),
            ],
            true,
        ),
    );
    const key = normalizeShapeHelper(helperFunction);
    const existing = state.objectIssuesHelperCache.get(key);
    if (existing !== undefined) {
        return existing;
    }
    state.hoistedDeclarations.push(helperFunction);
    state.objectIssuesHelperCache.set(key, helperName);
    return helperName;
}

/**
 * Emits the outlined form of a non-modifying object: a call to the hoisted issues-helper, routing a
 * non-undefined result through the sink's failure path. Only valid when the object cannot modify its value
 * (the helper reports issues; it cannot carry a modified value), so accumulate sinks must carry no
 * `outputSlot`. Returns `undefined` when the helper can't be generated; the caller falls back to inline
 * emission.
 */
function tryEmitOutlinedObject(
    ir: ObjectIR,
    valueExpression: ts.Expression,
    sink: Sink,
    state: State,
): ts.Statement[] | undefined {
    const threadsDepth = subtreeHasRef(ir);
    const helperName = getOrCreateObjectIssuesHelper(ir, threadsDepth, state);
    if (helperName === undefined) {
        return undefined;
    }
    const callArguments: ts.Expression[] = [valueExpression];
    if (threadsDepth && state.maxDepthIdentifier !== undefined) {
        callArguments.push(state.currentDepth, state.maxDepthIdentifier);
    }
    const childIssue = freshIdentifier(state, 'childIssue');
    const statements: ts.Statement[] = [
        constStatement(childIssue, undefined, call(helperName, callArguments)),
        ifStatement(notEquals(childIssue, undefinedExpression), [emitFailureRouting(childIssue, sink)]),
    ];
    const trailingSuccess = emitSuccessRouting(sink);
    if (trailingSuccess !== undefined) {
        statements.push(trailingSuccess);
    }
    return statements;
}

export { tryEmitOutlinedObject };
