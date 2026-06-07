import type { IR, IRGraph } from '@paseri/paseri/introspect';
import ts from 'typescript';
import {
    binary,
    block,
    call,
    constStatement,
    identifier,
    ifStatement,
    newExpression,
    not,
    numericLiteral,
    property,
    returnStatement,
    stringLiteral,
    typeReference,
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
import { emitSuccessRouting, failurePayload, leafExpression } from './issues.ts';
import { ResolutionError } from './resolver.ts';
import { RUNTIME_SOURCE } from './runtime.gen.ts';
import { makeState, type Sink, type State } from './state.ts';

const { factory } = ts;

/**
 * Options controlling how {@linkcode toSource} names and resolves the generated module.
 */
interface ToSourceOptions {
    /**
     * Base name for the generated validators. The compiled module exports `safeParse${name}` and a throwing
     * `parse${name}` — e.g. `name: 'Greeting'` yields `safeParseGreeting` and `parseGreeting`.
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
 * `noUnusedLocals` is off — and every non-trivial schema uses them). `PaseriError` is always imported because the
 * throwing `parse${Name}` entry is always emitted.
 */
function internalImportStatement(needs: ReadonlySet<string>): string {
    const values = needs.has('addIssue')
        ? ['addIssue', 'issueCodes', 'ParseErrorResult', 'PaseriError']
        : ['issueCodes', 'ParseErrorResult', 'PaseriError'];
    const types = ['type CustomIssueCode', 'type ParseResult', 'type TreeNode'];
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
    readonly optionsParameter: ts.Identifier | undefined;
    readonly setupStatements: ts.Statement[];
    readonly parameters: ts.ParameterDeclaration[];
}

/**
 * Builds the `(value [, options])` parameter list for an entry function. When `needsDepth`, also appends the optional
 * `options` parameter, emits the `maxDepth` setup statement, and — as a side effect — points `state.currentDepth` and
 * `state.maxDepthIdentifier` at the new scope so nested `ref` emits thread depth correctly.
 */
function buildEntryParameters(needsDepth: boolean, state: State): EntryParameters {
    const valueParameter = identifier('value');
    const parameters: ts.ParameterDeclaration[] = [
        factory.createParameterDeclaration(undefined, undefined, valueParameter, undefined, unknownType),
    ];
    const setupStatements: ts.Statement[] = [];
    let optionsParameter: ts.Identifier | undefined;

    if (needsDepth) {
        optionsParameter = identifier('options');
        const optionsType = factory.createTypeLiteralNode([
            factory.createPropertySignature(
                undefined,
                'maxDepth',
                factory.createToken(ts.SyntaxKind.QuestionToken),
                numberType,
            ),
        ]);
        parameters.push(
            factory.createParameterDeclaration(
                undefined,
                undefined,
                optionsParameter,
                factory.createToken(ts.SyntaxKind.QuestionToken),
                optionsType,
            ),
        );

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
        setupStatements.push(constStatement(maxDepthIdentifier, numberType, maxDepthExpression));
        // Mirror the runtime's safeParse/parse guard so a standalone generated validator rejects an invalid maxDepth
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
    }

    return { valueParameter, optionsParameter, setupStatements, parameters };
}

function buildEntryFunction(
    name: string,
    isExported: boolean,
    parameters: readonly ts.ParameterDeclaration[],
    bodyStatements: readonly ts.Statement[],
    outputType: ts.TypeNode,
): ts.FunctionDeclaration {
    return factory.createFunctionDeclaration(
        isExported ? [factory.createToken(ts.SyntaxKind.ExportKeyword)] : undefined,
        undefined,
        name,
        undefined,
        parameters,
        typeReference('ParseResult', [outputType]),
        block(bodyStatements),
    );
}

/**
 * Emits the throwing `parse${Name}` entry: a thin wrapper that delegates to `safeParse${Name}`, returning the bare
 * value on success and throwing `PaseriError` on failure, mirroring paseri-lib's runtime `parse`.
 */
function buildThrowingWrapper(
    parseName: string,
    safeParseName: string,
    needsDepth: boolean,
    outputType: ts.TypeNode,
): ts.FunctionDeclaration {
    const valueParameter = identifier('value');
    const parameters: ts.ParameterDeclaration[] = [
        factory.createParameterDeclaration(undefined, undefined, valueParameter, undefined, unknownType),
    ];
    const safeParseArguments: ts.Expression[] = [valueParameter];
    if (needsDepth) {
        const optionsParameter = identifier('options');
        const optionsType = factory.createTypeLiteralNode([
            factory.createPropertySignature(
                undefined,
                'maxDepth',
                factory.createToken(ts.SyntaxKind.QuestionToken),
                numberType,
            ),
        ]);
        parameters.push(
            factory.createParameterDeclaration(
                undefined,
                undefined,
                optionsParameter,
                factory.createToken(ts.SyntaxKind.QuestionToken),
                optionsType,
            ),
        );
        safeParseArguments.push(optionsParameter);
    }
    const resultIdentifier = identifier('result');
    const statements: ts.Statement[] = [
        constStatement(resultIdentifier, undefined, call(identifier(safeParseName), safeParseArguments)),
        ifStatement(property(resultIdentifier, 'ok'), [returnStatement(property(resultIdentifier, 'value'))]),
        factory.createThrowStatement(
            newExpression(identifier('PaseriError'), undefined, [property(resultIdentifier, 'issue')]),
        ),
    ];
    return factory.createFunctionDeclaration(
        [factory.createToken(ts.SyntaxKind.ExportKeyword)],
        undefined,
        parseName,
        undefined,
        parameters,
        outputType,
        block(statements),
    );
}

/** Assembles a top-level `(value [, options]) => ParseResult<Infer>` function from an IR, with optional export. */
function buildValidatorFunction(
    name: string,
    isExported: boolean,
    ir: IR,
    needsDepth: boolean,
    state: State,
): ts.FunctionDeclaration {
    const entry = buildEntryParameters(needsDepth, state);
    const sink: Sink = { kind: 'return', valueExpression: entry.valueParameter, outputType: emitType(ir) };
    const body = emitValidation(ir, entry.valueParameter, sink, state);
    const trailingSuccess = emitSuccessRouting(sink);
    const statements: ts.Statement[] = [...entry.setupStatements, ...body];
    if (trailingSuccess !== undefined) {
        statements.push(trailingSuccess);
    }
    return buildEntryFunction(name, isExported, entry.parameters, statements, emitType(ir));
}

/**
 * Tries to emit a split pair (tiny exported entry + private slow function)
 * for object-typed entries whose structure can be expressed as a pure boolean
 * shape check. Keeps the slow function cold on the happy path. Returns
 * undefined when the IR isn't shape-checkable; caller falls back to a single
 * emitted function.
 */
function tryEmitSplitFunctions(
    exportedName: string,
    slowName: string,
    ir: IR,
    needsDepth: boolean,
    state: State,
): ts.FunctionDeclaration[] | undefined {
    const entry = buildEntryParameters(needsDepth, state);
    const slowCallArguments: ts.Expression[] = [entry.valueParameter];
    if (entry.optionsParameter !== undefined) {
        slowCallArguments.push(entry.optionsParameter);
    }
    const slowCall = factory.createReturnStatement(
        factory.createCallExpression(identifier(slowName), undefined, slowCallArguments),
    );
    const shapeEntryBody = tryEmitShapeEntryBody(ir, entry.valueParameter, slowCall, state);
    if (shapeEntryBody === undefined) {
        return undefined;
    }
    // Build the slow function only once the split is confirmed — emitting it before the shape-entry check would leak
    // its hoisted constants (e.g. regexes) into the module even when we bail back to a single emitted function.
    const slowFunction = buildValidatorFunction(slowName, false, ir, needsDepth, state);
    const entryFunction = buildEntryFunction(exportedName, true, entry.parameters, shapeEntryBody, emitType(ir));
    return [slowFunction, entryFunction];
}

/**
 * Emits a recursive-ref entry point with depth threading. The generated function has the signature
 * `(value, depth, maxDepth) => Result<unknown>` and short-circuits with a `too_deep` failure before recursing further
 * when `depth >= maxDepth`.
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
        returnStatement(failurePayload(leafExpression('too_deep'))),
    ]);
    const statements: ts.Statement[] = [tooDeepCheck, ...body];
    if (trailingSuccess !== undefined) {
        statements.push(trailingSuccess);
    }

    return buildEntryFunction(
        name,
        false,
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
 * Compiles an IR graph into a TypeScript module that exports a `safeParse${options.name}` validator
 * matching paseri-lib's runtime `safeParse` shape. The returned source is a complete file — runtime helpers,
 * defaults, predicate hoists, and named-ref functions all inlined — ready to write to disk or evaluate in place.
 *
 * @example
 * ```ts
 * import * as p from '@paseri/paseri';
 * import '@paseri/paseri/introspect';
 * import { toSource } from '@paseri/compiler';
 *
 * const schema = p.object({ hello: p.string() });
 * const source = toSource(schema.toIR(), { name: 'Greeting' });
 * // `source` exports `safeParseGreeting` / `parseGreeting`.
 * ```
 */
function toSource(graph: IRGraph, options: ToSourceOptions): string {
    const state = makeState(new Set(options.trustedBareSpecifiers ?? []));
    state.namedCanModify = computeNamedCanModify(graph);
    const needsDepth = Object.keys(graph.named).length > 0;
    const exportedName = `safeParse${options.name}`;
    const throwingName = `parse${options.name}`;
    const slowName = `_slow${options.name}`;
    // Names the generated module binds; the resolver rejects a refine/chain callback that captures a colliding free
    // identifier rather than emitting it (see `reservedIdentifiers` on State). The runtime-contract import and helpers
    // are fixed; the entry/slow functions and named (lazy) entries derive from this graph.
    state.reservedIdentifiers = new Set<string>([
        'addIssue',
        'issueCodes',
        'ParseErrorResult',
        'isPlainObject',
        'deepFreeze',
        'structuredClone',
        'PaseriError',
        exportedName,
        throwingName,
        slowName,
        ...Object.keys(graph.named),
    ]);

    const namedFunctions: ts.Statement[] = [];
    for (const [name, ir] of Object.entries(graph.named)) {
        namedFunctions.push(emitNamedFunction(name, ir, state));
    }
    const splitFunctions = tryEmitSplitFunctions(exportedName, slowName, graph.entry, needsDepth, state);
    const entryFunctions: ts.Statement[] = splitFunctions ?? [
        buildValidatorFunction(exportedName, true, graph.entry, needsDepth, state),
    ];
    entryFunctions.push(buildThrowingWrapper(throwingName, exportedName, needsDepth, emitType(graph.entry)));

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
