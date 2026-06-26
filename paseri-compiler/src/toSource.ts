import type { IR, IRGraph } from '@paseri/paseri/introspect';
import ts from 'typescript';
import {
    binary,
    block,
    call,
    castTo,
    constStatement,
    equals,
    identifier,
    ifStatement,
    newExpression,
    not,
    numericLiteral,
    objectLiteral,
    property,
    returnStatement,
    stringLiteral,
    typeReference,
    typeUnion,
    undefinedExpression,
    undefinedType,
    unknownType,
} from './builders.ts';
import { computeNamedCanModify } from './can-modify.ts';
import { emitNamedTypeAliases, emitType } from './emit-type.ts';
import { emitArray } from './emitters/array.ts';
import { emitBigInt } from './emitters/bigint.ts';
import { emitBoolean } from './emitters/boolean.ts';
import { emitChain } from './emitters/chain.ts';
import { emitDate } from './emitters/date.ts';
import { emitDefault } from './emitters/default.ts';
import { emitDuration } from './emitters/duration.ts';
import { emitEnum } from './emitters/enum.ts';
import { emitInstant } from './emitters/instant.ts';
import { emitLiteral } from './emitters/literal.ts';
import { emitMap } from './emitters/map.ts';
import { emitNever } from './emitters/never.ts';
import { emitNull } from './emitters/null.ts';
import { emitNullable } from './emitters/nullable.ts';
import { emitNumber } from './emitters/number.ts';
import { emitObject, tryEmitShapeEntryBody } from './emitters/object/index.ts';
import { emitOptional } from './emitters/optional.ts';
import { emitPlainDate } from './emitters/plainDate.ts';
import { emitPlainDateTime } from './emitters/plainDateTime.ts';
import { emitPlainMonthDay } from './emitters/plainMonthDay.ts';
import { emitPlainTime } from './emitters/plainTime.ts';
import { emitPlainYearMonth } from './emitters/plainYearMonth.ts';
import { emitRecord } from './emitters/record.ts';
import { emitRef } from './emitters/ref.ts';
import { emitRefine } from './emitters/refine/index.ts';
import { emitSet } from './emitters/set.ts';
import { emitString } from './emitters/string.ts';
import { emitSymbol } from './emitters/symbol.ts';
import { emitTuple } from './emitters/tuple.ts';
import { emitUndefined } from './emitters/undefined.ts';
import { emitUnion } from './emitters/union/index.ts';
import { emitUnknown } from './emitters/unknown.ts';
import { emitZonedDateTime } from './emitters/zonedDateTime.ts';
import { emitSuccessRouting, failurePayload, leafExpression, successPayload } from './issues.ts';
import { ResolutionError } from './resolver.ts';
import { RUNTIME_SOURCE } from './runtime.gen.ts';
import { makeState, type Sink, type State } from './state.ts';

const { factory } = ts;

/**
 * Options controlling how {@linkcode toSource} names and resolves the generated module.
 */
interface ToSourceOptions {
    /**
     * Name of the exported object. The compiled module exports a single `const ${name}` mirroring the runtime
     * schema's surface (`.safeParse`, `.parse`, `['~standard']`), so it is a drop-in for a runtime schema of the
     * same name — `name: 'Greeting'` exports a `Greeting` usable as `Greeting.safeParse(...)` or `someLib(Greeting)`.
     */
    readonly name: string;
    /**
     * Bare module specifiers (e.g., `'zod'`, `'@scope/pkg'`) the caller has verified will resolve where the generated
     * module is consumed. Any bare specifier the resolver encounters that isn't in this list throws at compile time,
     * so typos and unverified packages can't silently slip through into the generated output.
     */
    readonly trustedBareSpecifiers?: readonly string[];
}

// Helpers spliced into compiled validators. `RUNTIME_SOURCE` is the verbatim text of `runtime.ts`, embedded by
// `deno task generate_runtime` so it travels with the module (a disk read off `import.meta.url` breaks when the
// package is loaded from a remote JSR URL). Parsed once at module load; `selectRuntimeStatements()` filters to
// those each schema needs.
const RUNTIME_AST = ts.createSourceFile('runtime.ts', RUNTIME_SOURCE, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);

function statementName(statement: ts.Statement): string | undefined {
    if (ts.isTypeAliasDeclaration(statement)) {
        return statement.name.text;
    }
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) {
        return statement.name.text;
    }
    if (ts.isClassDeclaration(statement) && statement.name !== undefined) {
        return statement.name.text;
    }
    return undefined;
}

function selectRuntimeStatements(needs: ReadonlySet<string>): ts.Statement[] {
    const result: ts.Statement[] = [];
    for (const statement of RUNTIME_AST.statements) {
        const name = statementName(statement);
        if (name !== undefined && needs.has(name)) {
            result.push(statement);
        }
    }
    return result;
}

/**
 * Walks the IR graph to determine which inlined utilities (`isPlainObject`, `deepFreeze`) to splice and whether
 * `addIssue` is imported. The result/issue/message contract is always imported from `@paseri/paseri/internal`.
 */
function analyzeNeeds(graph: IRGraph): Set<string> {
    const needs = new Set<string>();
    const seen = new WeakSet<IR>();
    function walk(node: IR): void {
        if (seen.has(node)) {
            return;
        }
        seen.add(node);
        switch (node.kind) {
            case 'object':
                needs.add('isPlainObject');
                needs.add('addIssue');
                for (const field of Object.values(node.fields)) {
                    walk(field);
                }
                return;
            case 'record':
                needs.add('isPlainObject');
                needs.add('addIssue');
                walk(node.element);
                return;
            case 'array':
            case 'set':
                needs.add('addIssue');
                walk(node.element);
                return;
            case 'map':
                needs.add('addIssue');
                walk(node.key);
                walk(node.value);
                return;
            case 'tuple':
                needs.add('addIssue');
                for (const element of node.elements) {
                    walk(element);
                }
                return;
            case 'union':
                needs.add('addIssue');
                for (const member of node.members) {
                    walk(member);
                }
                return;
            case 'optional':
            case 'nullable':
                walk(node.inner);
                return;
            case 'default':
                needs.add('deepFreeze');
                walk(node.inner);
                return;
            case 'refine':
                // Accumulate-sink branch routes failures via addIssue.
                needs.add('addIssue');
                walk(node.inner);
                return;
            case 'chain':
                // Chain validates from/to with an internal accumulator and routes the final outcome through addIssue.
                needs.add('addIssue');
                walk(node.from);
                walk(node.to);
                return;
            default:
                return;
        }
    }
    walk(graph.entry);
    for (const named of Object.values(graph.named)) {
        walk(named);
    }
    return needs;
}

/**
 * Builds the generated module's import of the result/message contract from the internal subpath. `addIssue` is
 * included only when a container accumulates issues; the rest are always imported (unused imports are harmless —
 * `noUnusedLocals` is off — and every non-trivial schema uses them).
 */
function internalImportStatement(needs: ReadonlySet<string>): string {
    const values = needs.has('addIssue')
        ? ['addIssue', 'isParseSuccess', 'issueCodes', 'ParseErrorResult', 'PaseriError']
        : ['isParseSuccess', 'issueCodes', 'ParseErrorResult', 'PaseriError'];
    const types = [
        'type CustomIssueCode',
        'type InternalParseResult',
        'type ParseResult',
        'type StandardSchemaV1',
        'type Translations',
        'type TreeNode',
    ];
    return `import { ${[...values, ...types].join(', ')} } from '@paseri/paseri/internal';`;
}

/**
 * Routes an IR node to its kind-specific emitter and returns the statements to splice into the caller. Throws
 * `ResolutionError` when the node itself is an `unsupported` marker that paseri-lib's introspect couldn't serialise
 * (children recurse through their own emitters).
 */
function emitValidation(ir: IR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    switch (ir.kind) {
        case 'string':
            return emitString(ir, valueExpression, sink, state);
        case 'number':
            return emitNumber(ir, valueExpression, sink, state);
        case 'bigint':
            return emitBigInt(ir, valueExpression, sink, state);
        case 'boolean':
            return emitBoolean(valueExpression, sink);
        case 'symbol':
            return emitSymbol(valueExpression, sink);
        case 'null':
            return emitNull(valueExpression, sink);
        case 'undefined':
            return emitUndefined(valueExpression, sink);
        case 'never':
            return emitNever(valueExpression, sink);
        case 'unknown':
            return emitUnknown(valueExpression, sink);
        case 'literal':
            return emitLiteral(ir, valueExpression, sink);
        case 'enum':
            return emitEnum(ir, valueExpression, sink, state);
        case 'array':
            return emitArray(ir, valueExpression, sink, state);
        case 'tuple':
            return emitTuple(ir, valueExpression, sink, state);
        case 'set':
            return emitSet(ir, valueExpression, sink, state);
        case 'map':
            return emitMap(ir, valueExpression, sink, state);
        case 'record':
            return emitRecord(ir, valueExpression, sink, state);
        case 'object':
            return emitObject(ir, valueExpression, sink, state);
        case 'union':
            return emitUnion(ir, valueExpression, sink, state);
        case 'optional':
            return emitOptional(ir, valueExpression, sink, state);
        case 'nullable':
            return emitNullable(ir, valueExpression, sink, state);
        case 'default':
            return emitDefault(ir, valueExpression, sink, state);
        case 'date':
            return emitDate(ir, valueExpression, sink, state);
        case 'duration':
            return emitDuration(valueExpression, sink);
        case 'instant':
            return emitInstant(ir, valueExpression, sink, state);
        case 'plainDate':
            return emitPlainDate(ir, valueExpression, sink, state);
        case 'plainDateTime':
            return emitPlainDateTime(ir, valueExpression, sink, state);
        case 'plainMonthDay':
            return emitPlainMonthDay(valueExpression, sink);
        case 'plainTime':
            return emitPlainTime(ir, valueExpression, sink, state);
        case 'plainYearMonth':
            return emitPlainYearMonth(ir, valueExpression, sink, state);
        case 'zonedDateTime':
            return emitZonedDateTime(ir, valueExpression, sink, state);
        case 'ref':
            return emitRef(ir, valueExpression, sink, state);
        case 'refine':
            return emitRefine(ir, valueExpression, sink, state);
        case 'chain':
            return emitChain(ir, valueExpression, sink, state);
        case 'unsupported':
            throw new ResolutionError(`Cannot compile an unsupported IR node (${ir.schema}): ${ir.reason}`);
    }
}

const DEFAULT_MAX_DEPTH = 1000;
const numberType = factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);

interface EntryParameters {
    readonly valueParameter: ts.Identifier;
    readonly optionsParameter: ts.Identifier;
    readonly setupStatements: ts.Statement[];
    readonly parameters: ts.ParameterDeclaration[];
}

/**
 * Builds the optional `options?: { maxDepth?: number }` parameter shared by the validator and its `safeParse` /
 * `parse` wrappers, so every generated entry point exposes an identical signature.
 */
function buildOptionsParameter(optionsParameter: ts.Identifier): ts.ParameterDeclaration {
    const optionsType = factory.createTypeLiteralNode([
        factory.createPropertySignature(
            undefined,
            'maxDepth',
            factory.createToken(ts.SyntaxKind.QuestionToken),
            numberType,
        ),
    ]);
    return factory.createParameterDeclaration(
        undefined,
        undefined,
        optionsParameter,
        factory.createToken(ts.SyntaxKind.QuestionToken),
        optionsType,
    );
}

/**
 * Builds the `(value, options?)` parameter list and `maxDepth` setup for an entry function, and — as a side effect —
 * points `state.currentDepth` / `state.maxDepthIdentifier` at the new scope so nested `ref` emits thread depth
 * correctly. Always emitted: a non-recursive schema never reads `maxDepth` for depth (the identifiers just go unread
 * without refs) but must still validate it, which the guard below does.
 */
function buildEntryParameters(state: State): EntryParameters {
    const valueParameter = identifier('value');
    const optionsParameter = identifier('options');
    const parameters: ts.ParameterDeclaration[] = [
        factory.createParameterDeclaration(undefined, undefined, valueParameter, undefined, unknownType),
        buildOptionsParameter(optionsParameter),
    ];

    const maxDepthIdentifier = identifier('maxDepth');
    const optionsMaxDepth = factory.createPropertyAccessChain(
        optionsParameter,
        factory.createToken(ts.SyntaxKind.QuestionDotToken),
        'maxDepth',
    );
    const maxDepthExpression = factory.createBinaryExpression(
        optionsMaxDepth,
        ts.SyntaxKind.QuestionQuestionToken,
        numericLiteral(DEFAULT_MAX_DEPTH),
    );
    const setupStatements: ts.Statement[] = [constStatement(maxDepthIdentifier, numberType, maxDepthExpression)];
    // Mirror the runtime's safeParse/parse guard so the generated validator rejects an invalid maxDepth
    // identically (rather than silently accepting NaN/Infinity/0/1.5 — NaN would otherwise disable the depth cap
    // and let cyclic/deep input recurse unbounded).
    setupStatements.push(
        ifStatement(
            binary(
                not(call(property(identifier('Number'), 'isInteger'), [maxDepthIdentifier])),
                ts.SyntaxKind.BarBarToken,
                binary(maxDepthIdentifier, ts.SyntaxKind.LessThanToken, numericLiteral(1)),
            ),
            [
                factory.createThrowStatement(
                    newExpression(identifier('Error'), undefined, [
                        stringLiteral('maxDepth must be a positive integer.'),
                    ]),
                ),
            ],
        ),
    );

    state.currentDepth = numericLiteral(0);
    state.maxDepthIdentifier = maxDepthIdentifier;

    return { valueParameter, optionsParameter, setupStatements, parameters };
}

function buildEntryFunction(
    name: string,
    parameters: readonly ts.ParameterDeclaration[],
    bodyStatements: readonly ts.Statement[],
    outputType: ts.TypeNode,
): ts.FunctionDeclaration {
    // Always internal — the only export is the `${name}` object (`export { _schema as ${name} }`).
    return factory.createFunctionDeclaration(
        undefined,
        undefined,
        name,
        undefined,
        parameters,
        typeReference('InternalParseResult', [outputType]),
        block(bodyStatements),
    );
}

/**
 * Emits the internal throwing `parse${Name}` wrapper: delegates to `safeParse${Name}`, returning the bare value on
 * success and throwing `PaseriError` on failure (mirroring paseri-lib's runtime `parse`). Aliased onto `${Name}` as
 * its `parse` method.
 */
function buildThrowingWrapper(
    parseName: string,
    safeParseName: string,
    outputType: ts.TypeNode,
): ts.FunctionDeclaration {
    const valueParameter = identifier('value');
    const optionsParameter = identifier('options');
    const parameters: ts.ParameterDeclaration[] = [
        factory.createParameterDeclaration(undefined, undefined, valueParameter, undefined, unknownType),
        buildOptionsParameter(optionsParameter),
    ];
    const safeParseArguments: ts.Expression[] = [valueParameter, optionsParameter];
    const resultIdentifier = identifier('result');
    const statements: ts.Statement[] = [
        constStatement(resultIdentifier, undefined, call(identifier(safeParseName), safeParseArguments)),
        ifStatement(property(resultIdentifier, 'ok'), [returnStatement(property(resultIdentifier, 'value'))]),
        factory.createThrowStatement(
            newExpression(identifier('PaseriError'), undefined, [property(resultIdentifier, 'issue')]),
        ),
    ];
    return factory.createFunctionDeclaration(
        undefined,
        undefined,
        parseName,
        undefined,
        parameters,
        outputType,
        block(statements),
    );
}

/**
 * Emits the `safeParse${Name}` wrapper: calls the shared `_validate${Name}` and resolves its `InternalParseResult`
 * to a `ParseResult` (mirroring paseri-lib's runtime `safeParse`) — `undefined` → success with the untouched input,
 * a success box passes through, a raw `TreeNode` becomes a `ParseErrorResult`. Aliased onto `${Name}` as its
 * `safeParse` method.
 */
function buildSafeParseWrapper(
    safeParseName: string,
    validateName: string,
    outputType: ts.TypeNode,
): ts.FunctionDeclaration {
    const valueParameter = identifier('value');
    const optionsParameter = identifier('options');
    const parameters: ts.ParameterDeclaration[] = [
        factory.createParameterDeclaration(undefined, undefined, valueParameter, undefined, unknownType),
        buildOptionsParameter(optionsParameter),
    ];
    const validateArguments: ts.Expression[] = [valueParameter, optionsParameter];
    const resultIdentifier = identifier('result');
    const statements: ts.Statement[] = [
        constStatement(resultIdentifier, undefined, call(identifier(validateName), validateArguments)),
        ifStatement(equals(resultIdentifier, undefinedExpression), [
            returnStatement(successPayload(valueParameter, outputType)),
        ]),
        ifStatement(call(identifier('isParseSuccess'), [resultIdentifier]), [returnStatement(resultIdentifier)]),
        returnStatement(failurePayload(resultIdentifier)),
    ];
    return factory.createFunctionDeclaration(
        undefined,
        undefined,
        safeParseName,
        undefined,
        parameters,
        typeReference('ParseResult', [outputType]),
        block(statements),
    );
}

/**
 * Emits the module's sole export: the `${name}` object. `safeParse`/`parse` alias the internal wrapper functions;
 * `~standard` adapts `safeParse${name}` to the Standard Schema spec (delegate to safeParse, map `messages(locale)`
 * → `issues`), mirroring paseri-lib's `Schema['~standard']` (see `schemas/schema.ts`). The `typeof` intersection
 * gives the value an explicit type for `isolatedDeclarations`; the `validate` params are typed contextually by it.
 *
 * Bound internally as `_schema` and surfaced via `export { _schema as ${name} }` rather than `export const
 * ${name}`: an export alias creates no module-scope binding, so a schema named after a global the validator body
 * uses (`Set`, `Map`, `Date`, …) can't shadow it and break the body.
 */
function buildStandardSchemaObject(
    name: string,
    safeParseName: string,
    parseName: string,
    outputType: ts.TypeNode,
): ts.Statement[] {
    const valueParameter = identifier('value');
    const optionsParameter = identifier('options');
    const resultIdentifier = identifier('result');

    const resultStatement = constStatement(
        resultIdentifier,
        undefined,
        call(identifier(safeParseName), [valueParameter]),
    );
    const okReturn = ifStatement(property(resultIdentifier, 'ok'), [
        returnStatement(objectLiteral({ value: property(resultIdentifier, 'value') })),
    ]);
    // options?.libraryOptions?.locale as Translations | undefined
    const localeAccess = factory.createPropertyAccessChain(
        factory.createPropertyAccessChain(
            optionsParameter,
            factory.createToken(ts.SyntaxKind.QuestionDotToken),
            'libraryOptions',
        ),
        factory.createToken(ts.SyntaxKind.QuestionDotToken),
        'locale',
    );
    const localeCast = castTo(localeAccess, typeUnion([typeReference('Translations'), undefinedType]));
    const issuesReturn = returnStatement(
        objectLiteral({ issues: call(property(resultIdentifier, 'messages'), [localeCast]) }),
    );

    const validateMethod = factory.createMethodDeclaration(
        undefined,
        undefined,
        'validate',
        undefined,
        undefined,
        [
            factory.createParameterDeclaration(undefined, undefined, valueParameter, undefined, undefined),
            factory.createParameterDeclaration(
                undefined,
                undefined,
                optionsParameter,
                factory.createToken(ts.SyntaxKind.QuestionToken),
                undefined,
            ),
        ],
        undefined,
        block([resultStatement, okReturn, issuesReturn]),
    );

    const standardProps = factory.createObjectLiteralExpression(
        [
            factory.createPropertyAssignment('version', numericLiteral(1)),
            factory.createPropertyAssignment('vendor', stringLiteral('paseri')),
            validateMethod,
        ],
        true,
    );

    const objectExpression = factory.createObjectLiteralExpression(
        [
            factory.createPropertyAssignment(stringLiteral('~standard'), standardProps),
            factory.createPropertyAssignment('safeParse', identifier(safeParseName)),
            factory.createPropertyAssignment('parse', identifier(parseName)),
        ],
        true,
    );

    const annotation = factory.createIntersectionTypeNode([
        typeReference('StandardSchemaV1', [unknownType, outputType]),
        factory.createTypeLiteralNode([
            factory.createPropertySignature(
                undefined,
                'safeParse',
                undefined,
                factory.createTypeQueryNode(identifier(safeParseName)),
            ),
            factory.createPropertySignature(
                undefined,
                'parse',
                undefined,
                factory.createTypeQueryNode(identifier(parseName)),
            ),
        ]),
    ]);

    const localName = '_schema';
    const objectDeclaration = factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(identifier(localName), undefined, annotation, objectExpression)],
            ts.NodeFlags.Const,
        ),
    );
    const exportDeclaration = factory.createExportDeclaration(
        undefined,
        false,
        factory.createNamedExports([factory.createExportSpecifier(false, localName, name)]),
    );
    return [objectDeclaration, exportDeclaration];
}

/**
 * Whether the emitted body already ends in an unconditional `return` — appending the trailing success return after
 * one would emit unreachable dead code (and, for large schemas, duplicate the full inline output type).
 */
function endsWithReturn(statements: readonly ts.Statement[]): boolean {
    const last = statements[statements.length - 1];
    return last !== undefined && ts.isReturnStatement(last);
}

/** Assembles a top-level `(value [, options]) => InternalParseResult<Infer>` validator from an IR. */
function buildValidatorFunction(name: string, ir: IR, state: State): ts.FunctionDeclaration {
    const entry = buildEntryParameters(state);
    const sink: Sink = { kind: 'return', valueExpression: entry.valueParameter, outputType: emitType(ir) };
    const body = emitValidation(ir, entry.valueParameter, sink, state);
    const trailingSuccess = emitSuccessRouting(sink);
    const statements: ts.Statement[] = [...entry.setupStatements, ...body];
    if (trailingSuccess !== undefined && !endsWithReturn(body)) {
        statements.push(trailingSuccess);
    }
    return buildEntryFunction(name, entry.parameters, statements, emitType(ir));
}

/**
 * Tries to emit a split pair (tiny shape-check entry + cold `_slow` validator) for object-typed entries whose
 * structure can be expressed as a pure boolean shape check. Both are internal validators returning
 * `InternalParseResult`. Returns undefined when the IR isn't shape-checkable; the caller falls back to a single
 * emitted validator.
 */
function tryEmitSplitFunctions(
    validateName: string,
    slowName: string,
    ir: IR,
    state: State,
): ts.FunctionDeclaration[] | undefined {
    const entry = buildEntryParameters(state);
    const slowCallArguments: ts.Expression[] = [entry.valueParameter, entry.optionsParameter];
    const slowCall = factory.createReturnStatement(
        factory.createCallExpression(identifier(slowName), undefined, slowCallArguments),
    );
    const shapeEntryBody = tryEmitShapeEntryBody(ir, entry.valueParameter, slowCall, state);
    if (shapeEntryBody === undefined) {
        return undefined;
    }
    // Build the slow function only once the split is confirmed — emitting it before the shape-entry check would leak
    // its hoisted constants (e.g. regexes) into the module even when we bail back to a single emitted function.
    const slowFunction = buildValidatorFunction(slowName, ir, state);
    // The setup statements matter on the fast path too: recursive shape helpers read `maxDepth`, and an invalid
    // `maxDepth` must throw even when the shape check would otherwise accept the value outright.
    const entryFunction = buildEntryFunction(
        validateName,
        entry.parameters,
        [...entry.setupStatements, ...shapeEntryBody],
        emitType(ir),
    );
    return [slowFunction, entryFunction];
}

/**
 * Emits a recursive-ref entry point with depth threading. The generated function has the signature
 * `(value, depth, maxDepth) => InternalParseResult<unknown>` and short-circuits with a raw `too_deep` `TreeNode`
 * before recursing further when `depth >= maxDepth`.
 */
function emitNamedFunction(name: string, ir: IR, state: State): ts.FunctionDeclaration {
    const valueParameter = identifier('value');
    const depthParameter = identifier('depth');
    const maxDepthParameter = identifier('maxDepth');

    state.currentDepth = binary(depthParameter, ts.SyntaxKind.PlusToken, numericLiteral(1));
    state.maxDepthIdentifier = maxDepthParameter;

    const sink: Sink = { kind: 'return', valueExpression: valueParameter, outputType: emitType(ir) };
    const body = emitValidation(ir, valueParameter, sink, state);
    const trailingSuccess = emitSuccessRouting(sink);

    const tooDeepCheck = ifStatement(binary(depthParameter, ts.SyntaxKind.GreaterThanEqualsToken, maxDepthParameter), [
        returnStatement(leafExpression('too_deep')),
    ]);
    const statements: ts.Statement[] = [tooDeepCheck, ...body];
    if (trailingSuccess !== undefined && !endsWithReturn(body)) {
        statements.push(trailingSuccess);
    }

    return buildEntryFunction(
        name,
        [
            factory.createParameterDeclaration(undefined, undefined, valueParameter, undefined, unknownType),
            factory.createParameterDeclaration(undefined, undefined, depthParameter, undefined, numberType),
            factory.createParameterDeclaration(undefined, undefined, maxDepthParameter, undefined, numberType),
        ],
        statements,
        emitType(ir),
    );
}

/**
 * Compiles an IR graph into a TypeScript module that exports a single `const ${options.name}` object mirroring
 * paseri-lib's runtime schema surface (`.safeParse`, `.parse`, and the Standard Schema `['~standard']`), so it is a
 * drop-in for a runtime schema of the same name. The returned source is a complete module: it imports the
 * result/issue/message contract from `@paseri/paseri/internal` and inlines the rest, ready to write to disk or
 * evaluate in place.
 *
 * @example
 * ```ts
 * import * as p from '@paseri/paseri';
 * import '@paseri/paseri/introspect';
 * import { toSource } from '@paseri/compiler';
 *
 * const schema = p.object({ hello: p.string() });
 * const source = toSource(schema.toIR(), { name: 'Greeting' });
 * // `source` exports `Greeting`, a drop-in for `schema`: `Greeting.safeParse(input)`,
 * // `Greeting.parse(input)`, or handed to any Standard Schema consumer.
 * ```
 */
function toSource(graph: IRGraph, options: ToSourceOptions): string {
    const state = makeState(new Set(options.trustedBareSpecifiers ?? []));
    state.namedCanModify = computeNamedCanModify(graph);
    state.namedIRs = graph.named;
    state.cyclicNames = new Set(graph.cycles);
    // `_validate${Name}` (+ `_slow${Name}`) is the shared validator returning an `InternalParseResult`; the thin
    // `safeParse${Name}` / `parse${Name}` wrappers resolve it to a `ParseResult` / value, and the `_schema` object
    // aliases them.
    const validateName = `_validate${options.name}`;
    const slowName = `_slow${options.name}`;
    const safeParseName = `safeParse${options.name}`;
    const throwingName = `parse${options.name}`;
    // Names the generated module binds; the resolver rejects a refine/chain callback that captures a colliding free
    // identifier rather than emitting it (see `reservedIdentifiers` on State). The runtime-contract import and helpers
    // are fixed; the validator/wrapper functions and named (lazy) entries derive from this graph.
    state.reservedIdentifiers = new Set<string>([
        'addIssue',
        'issueCodes',
        'ParseErrorResult',
        'isParseSuccess',
        'isPlainObject',
        'deepFreeze',
        'structuredClone',
        'PaseriError',
        // `_schema` is the internal binding for the exported `${name}` object (surfaced via `export … as`; see
        // buildStandardSchemaObject) — reserve it.
        '_schema',
        validateName,
        safeParseName,
        throwingName,
        slowName,
        ...Object.keys(graph.named),
    ]);

    const namedFunctions: ts.Statement[] = [];
    for (const [name, ir] of Object.entries(graph.named)) {
        // Acyclic targets are inlined at their ref sites (see emitInlinedRef); only true cycles need a function.
        if (!state.cyclicNames.has(name)) {
            continue;
        }
        namedFunctions.push(emitNamedFunction(name, ir, state));
    }
    const splitFunctions = tryEmitSplitFunctions(validateName, slowName, graph.entry, state);
    const entryFunctions: ts.Statement[] = splitFunctions ?? [buildValidatorFunction(validateName, graph.entry, state)];
    // Thin wrappers over the shared validator (see above); the `${name}` object aliases them, and `~standard`
    // adapts safeParse to the spec.
    entryFunctions.push(buildSafeParseWrapper(safeParseName, validateName, emitType(graph.entry)));
    entryFunctions.push(buildThrowingWrapper(throwingName, safeParseName, emitType(graph.entry)));
    entryFunctions.push(...buildStandardSchemaObject(options.name, safeParseName, throwingName, emitType(graph.entry)));

    const needs = analyzeNeeds(graph);
    const runtimeStatements = selectRuntimeStatements(needs);
    state.importHoists.push(internalImportStatement(needs));
    // Recursive `type <name>Type` aliases for named (lazy) entries, so `ref` output types resolve.
    const namedTypeAliases = emitNamedTypeAliases(graph);
    const head = [...runtimeStatements, ...namedTypeAliases, ...state.hoistedDeclarations];
    const tail = [...namedFunctions, ...entryFunctions];

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const parts: string[] = ['// Auto-generated by paseri-compiler. Do not edit.'];
    // ES `import` declarations must appear before any other top-level statement.
    parts.push(...state.importHoists);
    for (const statement of head) {
        parts.push(printer.printNode(ts.EmitHint.Unspecified, statement, RUNTIME_AST));
    }
    // Text hoists go between runtime helpers and entry functions — they may reference runtime helpers and the entry
    // functions need them in scope.
    parts.push(...state.textHoists);
    for (const statement of tail) {
        parts.push(printer.printNode(ts.EmitHint.Unspecified, statement, RUNTIME_AST));
    }
    return `${parts.join('\n\n')}\n`;
}

export { emitValidation, type ToSourceOptions, toSource };
