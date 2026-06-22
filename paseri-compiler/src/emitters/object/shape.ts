import type { IR } from '@paseri/paseri/introspect';
import ts from 'typescript';
import {
    binary,
    block,
    booleanType,
    call,
    castTo,
    constStatement,
    elementAccess,
    equals,
    expressionStatement,
    falseLiteral,
    forIn,
    forOf,
    functionType,
    identifier,
    ifStatement,
    incrementDepth,
    instanceOf,
    isZeroDepth,
    letStatement,
    literalExpression,
    not,
    notEquals,
    numericLiteral,
    postfixIncrement,
    property,
    recordAccess,
    recordCast,
    returnStatement,
    stringLiteral,
    ternary,
    trueLiteral,
    typeofExpression,
    undefinedExpression,
    unknownType,
} from '../../builders.ts';
import { emitType } from '../../emit-type.ts';
import { ResolutionError } from '../../resolver.ts';
import { freshIdentifier, hoistEnum, hoistRegex, type State } from '../../state.ts';
import { getOrCreateCallback } from '../refine/index.ts';
import { regexTestExpression } from '../string.ts';
import { isFieldOptional, isReconstructableStripObject, PROTOTYPE_NAMES, type StrictLevel } from './common.ts';

const { factory } = ts;

const helperKeyPrinter = ts.createPrinter();
const helperKeySourceFile = ts.createSourceFile('_helper.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);

/**
 * Collects, in source order, the identifier names a function declaration *binds* — its own name, its parameters,
 * every variable it declares, and every statement label (fresh `_labelCheck<N>` labels would otherwise keep
 * structurally-identical bodies from sharing a key). Free references (hoisted helper names, regexes, builtins)
 * are deliberately excluded so they survive normalisation intact.
 */
function collectBoundNames(node: ts.Node, names: string[]): void {
    if (ts.isFunctionDeclaration(node) && node.name !== undefined && !names.includes(node.name.text)) {
        names.push(node.name.text);
    }
    if (
        (ts.isParameter(node) || ts.isVariableDeclaration(node)) &&
        ts.isIdentifier(node.name) &&
        !names.includes(node.name.text)
    ) {
        names.push(node.name.text);
    }
    if (ts.isLabeledStatement(node) && !names.includes(node.label.text)) {
        names.push(node.label.text);
    }
    ts.forEachChild(node, (child) => collectBoundNames(child, names));
}

/**
 * Normalizes a shape helper to a dedup key: its bound locals (name / params / declared vars) renamed to positional
 * `__bound<N>__` sentinels in declaration order, with free references left untouched. Two helpers sharing a key are
 * byte-identical up to local renaming AND reference the same free identifiers (e.g. the same hoisted inner helper), so
 * collapsing them to one declaration is sound — distinct free references (different inner helpers / regexes) keep the
 * keys apart. The sentinel can't collide with a generated identifier (those are `_<word><digits>`, never `__bound`).
 */
function normalizeShapeHelper(helperFunction: ts.FunctionDeclaration): string {
    const boundNames: string[] = [];
    collectBoundNames(helperFunction, boundNames);
    let text = helperKeyPrinter.printNode(ts.EmitHint.Unspecified, helperFunction, helperKeySourceFile);
    boundNames.forEach((name, index) => {
        text = text.replace(new RegExp(`\\b${name}\\b`, 'g'), `__bound${index}__`);
    });
    return text;
}

const numberType = factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);

type HelperParameter = { readonly name: ts.Identifier; readonly type: ts.TypeNode };

/**
 * Hoists a module-scope `function <namePrefix>N(...parameters): boolean` with the given body. Returns the helper's
 * name. Used by container shape-checks (array/record/set/map) to outline a tight per-element check that V8 can
 * inline at the call site, and by the strict-extras key-count check. Deduplicated by normalized body, so
 * structurally-identical helpers share one declaration. While a ref-shape transaction is open the declaration is
 * buffered on it instead of hoisted directly (see `State.refShapeSession`).
 */
function emitShapeHelper(
    state: State,
    namePrefix: string,
    parameters: readonly HelperParameter[],
    bodyStatements: readonly ts.Statement[],
): ts.Identifier {
    const helperName = freshIdentifier(state, namePrefix);
    const helperFunction = factory.createFunctionDeclaration(
        undefined,
        undefined,
        helperName,
        undefined,
        parameters.map((parameter) =>
            factory.createParameterDeclaration(undefined, undefined, parameter.name, undefined, parameter.type),
        ),
        factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
        block(bodyStatements),
    );
    const key = normalizeShapeHelper(helperFunction);
    const existing = state.shapeHelperCache.get(key);
    if (existing !== undefined) {
        return existing;
    }
    if (state.refShapeSession !== undefined) {
        state.refShapeSession.bufferedDeclarations.push(helperFunction);
        state.refShapeSession.shapeHelperKeys.push(key);
    } else {
        state.hoistedDeclarations.push(helperFunction);
    }
    state.shapeHelperCache.set(key, helperName);
    return helperName;
}

/**
 * Hoists `function _extrasOkN(obj): boolean` returning whether `obj`'s enumerable key count stays within
 * `requiredCount` plus the actually-present optional fields — the same threshold `buildSuccessWithExtrasCheck`
 * emits in statement form. Used where a strict/strip level can't propagate to the entry's statement-form pass
 * (container elements, union members, recursive ref targets): a `false` routes the value to the slow path, which
 * re-validates and reports the unrecognised keys exactly.
 */
function emitExtrasHelper(state: State, requiredCount: number, optionalFieldNames: readonly string[]): ts.Identifier {
    const objectParameter = freshIdentifier(state, 'obj');
    const countIdentifier = freshIdentifier(state, 'count');
    const keyIdentifier = freshIdentifier(state, 'k');
    let threshold: ts.Expression = numericLiteral(requiredCount);
    for (const fieldName of optionalFieldNames) {
        threshold = binary(
            threshold,
            ts.SyntaxKind.PlusToken,
            ternary(
                notEquals(recordAccess(objectParameter, stringLiteral(fieldName)), undefinedExpression),
                numericLiteral(1),
                numericLiteral(0),
            ),
        );
    }
    const statements: ts.Statement[] = [
        letStatement(countIdentifier, undefined, numericLiteral(0)),
        forIn(keyIdentifier, objectParameter, [expressionStatement(postfixIncrement(countIdentifier))]),
        returnStatement(binary(countIdentifier, ts.SyntaxKind.LessThanEqualsToken, threshold)),
    ];
    const parameterType = factory.createTypeReferenceNode('Record', [
        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        unknownType,
    ]);
    return emitShapeHelper(state, 'extrasOk', [{ name: objectParameter, type: parameterType }], statements);
}

/**
 * Whether validating `ir` can apply a `.default()` anywhere — including through named (lazy) targets. A default
 * makes a shape under-matching (false while the runtime MATCHES, with modification), which is sound when shape
 * failure routes to the slow path but unsound when it falls through to a sibling union member: the sibling would
 * fast-accept the input unmodified while the runtime returns the earlier member's defaulted value. Union shape
 * forms with member-to-member fallthrough must therefore cut off at the first default-containing member.
 */
function containsReachableDefault(ir: IR, state: State, visited: Set<string>): boolean {
    switch (ir.kind) {
        case 'default':
            return true;
        case 'optional':
        case 'nullable':
        case 'refine':
            return containsReachableDefault(ir.inner, state, visited);
        case 'array':
        case 'set':
        case 'record':
            return containsReachableDefault(ir.element, state, visited);
        case 'map':
            return (
                containsReachableDefault(ir.key, state, visited) || containsReachableDefault(ir.value, state, visited)
            );
        case 'tuple':
            return ir.elements.some((element) => containsReachableDefault(element, state, visited));
        case 'object':
            return Object.values(ir.fields).some((field) => containsReachableDefault(field, state, visited));
        case 'union':
            return ir.members.some((member) => containsReachableDefault(member, state, visited));
        case 'chain':
            return containsReachableDefault(ir.from, state, visited) || containsReachableDefault(ir.to, state, visited);
        case 'ref': {
            if (visited.has(ir.name)) {
                return false;
            }
            visited.add(ir.name);
            const target = state.namedIRs[ir.name];
            return target !== undefined && containsReachableDefault(target, state, visited);
        }
        default:
            return false;
    }
}

/**
 * Runs one shape-generation attempt transactionally. Helper declarations created inside (container shape helpers,
 * extras helpers, recursive ref helpers) buffer on `state.refShapeSession`; when `generate` fails (returns
 * undefined) the attempt's additions are rolled back — declarations discarded, dedup-cache keys evicted, and
 * completed-but-discarded ref helpers un-cached so a later attempt can regenerate them (structurally failed refs
 * stay `'failed'`). A leftover declaration could otherwise reference a recursive identifier that is never emitted,
 * and even a self-contained one would be dead module code. The outermost attempt owns the session and flushes the
 * surviving buffer to `hoistedDeclarations`; nested attempts (union members inside an entry attempt, refs inside
 * anything) roll back only their own slice.
 */
function withShapeAttempt<T>(state: State, generate: () => T | undefined): T | undefined {
    const isRoot = state.refShapeSession === undefined;
    if (isRoot) {
        state.refShapeSession = { bufferedDeclarations: [], names: [], shapeHelperKeys: [] };
    }
    const session = state.refShapeSession;
    if (session === undefined) {
        return undefined;
    }
    const declarationsMark = session.bufferedDeclarations.length;
    const namesMark = session.names.length;
    const keysMark = session.shapeHelperKeys.length;
    const result = generate();
    if (result === undefined) {
        for (const name of session.names.slice(namesMark)) {
            if (state.refShapeCache.get(name) !== 'failed') {
                state.refShapeCache.delete(name);
            }
        }
        for (const key of session.shapeHelperKeys.slice(keysMark)) {
            state.shapeHelperCache.delete(key);
        }
        session.bufferedDeclarations.length = declarationsMark;
        session.names.length = namesMark;
        session.shapeHelperKeys.length = keysMark;
    }
    if (isRoot) {
        state.hoistedDeclarations.push(...session.bufferedDeclarations);
        state.refShapeSession = undefined;
    }
    return result;
}

/**
 * `tryShape` for positions where strict/strip levels can't aggregate into the caller's statement-form extras pass
 * (container elements, union members, ref targets): each level folds into the expression itself as a hoisted
 * key-count helper call. The calls are appended AFTER the structural conjuncts, so a count only runs once every
 * field of its level is known present — the same ordering argument as `buildSuccessWithExtrasCheck`.
 */
function tryShapeSelfContained(ir: IR, valueExpression: ts.Expression, state: State): ts.Expression | undefined {
    const strictLevels: StrictLevel[] = [];
    let result = tryShape(ir, valueExpression, strictLevels, state);
    if (result === undefined) {
        return undefined;
    }
    for (const level of strictLevels) {
        const helperName = emitExtrasHelper(state, level.requiredCount, level.optionalFieldNames);
        result = binary(
            result,
            ts.SyntaxKind.AmpersandAmpersandToken,
            call(helperName, [recordCast(level.valueExpression)]),
        );
    }
    return result;
}

interface ScopedShape<T> {
    readonly result: T;
    /** Whether generation emitted any recursive ref-helper call, i.e. the depth parameters are actually referenced. */
    readonly usedRef: boolean;
    readonly depthParameter: ts.Identifier;
    readonly maxDepthParameter: ts.Identifier;
}

/**
 * Runs `generate` with `state.currentDepth` / `state.maxDepthIdentifier` pointed at fresh parameter identifiers, so
 * recursive ref-helper calls emitted inside a hoisted container helper reference the helper's own parameters rather
 * than identifiers from the enclosing scope (which wouldn't exist at module scope). The caller threads the
 * parameters through the helper signature when `usedRef` is set, passing the enclosing scope's depth verbatim — the
 * `+ 1` per lazy level is applied at ref-helper boundaries, mirroring the runtime's accounting.
 */
function withScopedDepth<T>(state: State, generate: () => T | undefined): ScopedShape<T> | undefined {
    const depthParameter = freshIdentifier(state, 'depth');
    const maxDepthParameter = freshIdentifier(state, 'maxDepth');
    const savedDepth = state.currentDepth;
    const savedMaxDepth = state.maxDepthIdentifier;
    const usesBefore = state.refShapeUses;
    state.currentDepth = depthParameter;
    state.maxDepthIdentifier = maxDepthParameter;
    const result = generate();
    state.currentDepth = savedDepth;
    state.maxDepthIdentifier = savedMaxDepth;
    if (result === undefined) {
        return undefined;
    }
    return { result, usedRef: state.refShapeUses > usesBefore, depthParameter, maxDepthParameter };
}

/**
 * The extra helper parameters and call-site arguments for a container helper whose element shape used recursive
 * refs. Returns undefined when threading is needed but no `maxDepth` is in scope (unreachable in practice: refs only
 * exist when the entry threads depth).
 */
function depthThreading(
    scoped: ScopedShape<unknown>,
    state: State,
): { readonly parameters: HelperParameter[]; readonly callArguments: ts.Expression[] } | undefined {
    if (!scoped.usedRef) {
        return { parameters: [], callArguments: [] };
    }
    if (state.maxDepthIdentifier === undefined) {
        return undefined;
    }
    return {
        parameters: [
            { name: scoped.depthParameter, type: numberType },
            { name: scoped.maxDepthParameter, type: numberType },
        ],
        callArguments: [state.currentDepth, state.maxDepthIdentifier],
    };
}

/**
 * Returns the recursive boolean shape helper `_shapeLazyN(value, depth, maxDepth)` for a named (lazy) graph entry,
 * generating and hoisting it on first use. The helper mirrors the named function's depth accounting exactly — the
 * same entry check and the same `depth + 1` at nested ref calls — so it returns false for every input the runtime
 * rejects with `too_deep`, and the slow path reproduces the issue.
 *
 * Generation runs inside `withShapeAttempt`; on failure the attempt's declarations roll back and the name is cached
 * as `'failed'` (structural unshapeability is permanent) so later references bail immediately.
 */
function getOrCreateRefShapeHelper(name: string, state: State): ts.Identifier | undefined {
    const cached = state.refShapeCache.get(name);
    if (cached === 'failed') {
        return undefined;
    }
    if (cached !== undefined) {
        return cached;
    }
    const target = state.namedIRs[name];
    if (target === undefined) {
        return undefined;
    }
    const result = withShapeAttempt(state, () => {
        const session = state.refShapeSession;
        if (session === undefined) {
            return undefined;
        }
        const helperName = freshIdentifier(state, 'shapeLazy');
        // Cache before generating the body: a recursive reference to `name` mid-generation resolves to this
        // identifier. The attempt records the name, so a failure rolls the cache entry back.
        state.refShapeCache.set(name, helperName);
        session.names.push(name);

        const valueParameter = identifier('value');
        const depthParameter = identifier('depth');
        const maxDepthParameter = identifier('maxDepth');
        const savedDepth = state.currentDepth;
        const savedMaxDepth = state.maxDepthIdentifier;
        state.currentDepth = binary(depthParameter, ts.SyntaxKind.PlusToken, numericLiteral(1));
        state.maxDepthIdentifier = maxDepthParameter;
        const shape = tryShapeSelfContained(target, valueParameter, state);
        state.currentDepth = savedDepth;
        state.maxDepthIdentifier = savedMaxDepth;
        if (shape === undefined) {
            return undefined;
        }

        const helperFunction = factory.createFunctionDeclaration(
            undefined,
            undefined,
            helperName,
            undefined,
            [
                factory.createParameterDeclaration(undefined, undefined, valueParameter, undefined, unknownType),
                factory.createParameterDeclaration(undefined, undefined, depthParameter, undefined, numberType),
                factory.createParameterDeclaration(undefined, undefined, maxDepthParameter, undefined, numberType),
            ],
            factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
            block([
                ifStatement(binary(depthParameter, ts.SyntaxKind.GreaterThanEqualsToken, maxDepthParameter), [
                    returnStatement(falseLiteral),
                ]),
                returnStatement(shape),
            ]),
        );
        session.bufferedDeclarations.push(helperFunction);
        return helperName;
    });
    if (result === undefined) {
        state.refShapeCache.set(name, 'failed');
    }
    return result;
}

/**
 * Whether the expression `tryShape(ir, ...)` builds can evaluate to true for `undefined` — i.e. whether reading an
 * absent object key could satisfy the field's shape check. Required fields with such shapes need an explicit
 * presence conjunct (see the `object` arm and `tryEmitDefaultObjectEntry`). Conservative: kinds not known to reject
 * undefined return true (the presence check is always sound for a required field, it just costs one `in` test).
 */
function shapeMatchesUndefined(ir: IR): boolean {
    switch (ir.kind) {
        case 'undefined':
        case 'unknown':
        case 'optional':
            return true;
        case 'nullable':
        case 'refine':
            return shapeMatchesUndefined(ir.inner);
        case 'union':
            return ir.members.some(shapeMatchesUndefined);
        case 'default':
            // The `default` arm guards with `value !== undefined` whenever its inner shape accepts undefined.
            return false;
        case 'string':
        case 'number':
        case 'bigint':
        case 'boolean':
        case 'null':
        case 'symbol':
        case 'never':
        case 'literal':
        case 'enum':
        case 'date':
        case 'duration':
        case 'instant':
        case 'plainDate':
        case 'plainDateTime':
        case 'plainMonthDay':
        case 'plainTime':
        case 'plainYearMonth':
        case 'zonedDateTime':
        case 'record':
        case 'set':
        case 'map':
        case 'array':
        case 'tuple':
        case 'object':
            return false;
        default:
            return true;
    }
}

/**
 * Builds a pure boolean expression that's true iff `valueExpression` matches
 * `ir`'s structural shape. Returns undefined when the IR uses constructs that
 * can't be inlined as a pure expression (chain, refine with unresolvable
 * predicate, primitives with checks, etc.). Strict/strip object levels are
 * appended to `strictLevels` so the caller can emit an extras-detection pass.
 *
 * Chained boolean over typeof / Number.isNaN / Object.getPrototypeOf
 * optimises well on stable hidden classes.
 */
function tryShape(
    ir: IR,
    valueExpression: ts.Expression,
    strictLevels: StrictLevel[],
    state: State,
): ts.Expression | undefined {
    // Reconstruction context is for this one node; capture and clear so it can't leak into nested positions. The
    // `object` arm re-sets it only for fields it reconstructs.
    const reconstructing = state.reconstructingStrip;
    state.reconstructingStrip = false;
    switch (ir.kind) {
        case 'string': {
            let result: ts.Expression = equals(typeofExpression(valueExpression), stringLiteral('string'));
            for (const check of ir.checks) {
                let clause: ts.Expression;
                switch (check.name) {
                    case 'min':
                        clause = binary(
                            property(valueExpression, 'length'),
                            ts.SyntaxKind.GreaterThanEqualsToken,
                            numericLiteral(check.value),
                        );
                        break;
                    case 'max':
                        clause = binary(
                            property(valueExpression, 'length'),
                            ts.SyntaxKind.LessThanEqualsToken,
                            numericLiteral(check.value),
                        );
                        break;
                    case 'includes':
                        clause = call(property(valueExpression, 'includes'), [stringLiteral(check.value)]);
                        break;
                    case 'startsWith':
                        clause = call(property(valueExpression, 'startsWith'), [stringLiteral(check.value)]);
                        break;
                    case 'endsWith':
                        clause = call(property(valueExpression, 'endsWith'), [stringLiteral(check.value)]);
                        break;
                    case 'url': {
                        // Two-stage `fastAccept.test(value) || URL.canParse(value)`, matching the return-sink arm.
                        const regexIdentifier = hoistRegex(state, check.source, check.flags);
                        clause = binary(
                            regexTestExpression(regexIdentifier, valueExpression, check.flags),
                            ts.SyntaxKind.BarBarToken,
                            call(property(identifier('URL'), 'canParse'), [valueExpression]),
                        );
                        break;
                    }
                    default: {
                        // Regex-based check (uses check.source / check.flags). RegExp hoisted to module scope
                        // (deduplicated by source+flags via `hoistRegex`) to avoid per-parse allocation.
                        // `regexTestExpression` resets lastIndex for global/sticky regexes so a match doesn't
                        // send the next call down the slow path.
                        const regexIdentifier = hoistRegex(state, check.source, check.flags);
                        clause = regexTestExpression(regexIdentifier, valueExpression, check.flags);
                    }
                }
                result = binary(result, ts.SyntaxKind.AmpersandAmpersandToken, clause);
            }
            return result;
        }
        case 'number': {
            let result: ts.Expression = binary(
                equals(typeofExpression(valueExpression), stringLiteral('number')),
                ts.SyntaxKind.AmpersandAmpersandToken,
                not(call(property(identifier('Number'), 'isNaN'), [valueExpression])),
            );
            for (const check of ir.checks) {
                let clause: ts.Expression;
                switch (check.name) {
                    case 'gt':
                        clause = binary(valueExpression, ts.SyntaxKind.GreaterThanToken, numericLiteral(check.value));
                        break;
                    case 'gte':
                        clause = binary(
                            valueExpression,
                            ts.SyntaxKind.GreaterThanEqualsToken,
                            numericLiteral(check.value),
                        );
                        break;
                    case 'lt':
                        clause = binary(valueExpression, ts.SyntaxKind.LessThanToken, numericLiteral(check.value));
                        break;
                    case 'lte':
                        clause = binary(
                            valueExpression,
                            ts.SyntaxKind.LessThanEqualsToken,
                            numericLiteral(check.value),
                        );
                        break;
                    case 'int':
                        clause = call(property(identifier('Number'), 'isInteger'), [valueExpression]);
                        break;
                    case 'finite':
                        clause = call(property(identifier('Number'), 'isFinite'), [valueExpression]);
                        break;
                    case 'safe':
                        clause = call(property(identifier('Number'), 'isSafeInteger'), [valueExpression]);
                        break;
                }
                result = binary(result, ts.SyntaxKind.AmpersandAmpersandToken, clause);
            }
            return result;
        }
        case 'bigint': {
            let result: ts.Expression = equals(typeofExpression(valueExpression), stringLiteral('bigint'));
            for (const check of ir.checks) {
                let op: ts.BinaryOperator;
                switch (check.name) {
                    case 'gt':
                        op = ts.SyntaxKind.GreaterThanToken;
                        break;
                    case 'gte':
                        op = ts.SyntaxKind.GreaterThanEqualsToken;
                        break;
                    case 'lt':
                        op = ts.SyntaxKind.LessThanToken;
                        break;
                    case 'lte':
                        op = ts.SyntaxKind.LessThanEqualsToken;
                        break;
                }
                result = binary(
                    result,
                    ts.SyntaxKind.AmpersandAmpersandToken,
                    binary(valueExpression, op, literalExpression(check.value)),
                );
            }
            return result;
        }
        case 'boolean':
            return equals(typeofExpression(valueExpression), stringLiteral('boolean'));
        case 'null':
            return equals(valueExpression, ts.factory.createNull());
        case 'undefined':
            return equals(valueExpression, undefinedExpression);
        case 'symbol':
            return equals(typeofExpression(valueExpression), stringLiteral('symbol'));
        case 'unknown':
            return trueLiteral;
        case 'never':
            return falseLiteral;
        case 'literal':
            return equals(valueExpression, literalExpression(ir.value));
        case 'date': {
            if (ir.checks.length !== 0) {
                return undefined;
            }
            // Paseri rejects `new Date('invalid')` (NaN time), so the shape
            // check has to mirror that.
            return binary(
                instanceOf(valueExpression, identifier('Date')),
                ts.SyntaxKind.AmpersandAmpersandToken,
                not(call(property(identifier('Number'), 'isNaN'), [call(property(valueExpression, 'getTime'), [])])),
            );
        }
        case 'duration':
            return instanceOf(valueExpression, property(identifier('Temporal'), 'Duration'));
        case 'instant':
            if (ir.checks.length !== 0) {
                return undefined;
            }
            return instanceOf(valueExpression, property(identifier('Temporal'), 'Instant'));
        case 'plainDate':
            if (ir.checks.length !== 0) {
                return undefined;
            }
            return instanceOf(valueExpression, property(identifier('Temporal'), 'PlainDate'));
        case 'plainDateTime':
            if (ir.checks.length !== 0) {
                return undefined;
            }
            return instanceOf(valueExpression, property(identifier('Temporal'), 'PlainDateTime'));
        case 'plainMonthDay':
            return instanceOf(valueExpression, property(identifier('Temporal'), 'PlainMonthDay'));
        case 'plainTime':
            if (ir.checks.length !== 0) {
                return undefined;
            }
            return instanceOf(valueExpression, property(identifier('Temporal'), 'PlainTime'));
        case 'plainYearMonth':
            if (ir.checks.length !== 0) {
                return undefined;
            }
            return instanceOf(valueExpression, property(identifier('Temporal'), 'PlainYearMonth'));
        case 'zonedDateTime':
            if (ir.checks.length !== 0) {
                return undefined;
            }
            return instanceOf(valueExpression, property(identifier('Temporal'), 'ZonedDateTime'));
        case 'nullable': {
            const innerShape = tryShape(ir.inner, valueExpression, strictLevels, state);
            if (innerShape === undefined) {
                return undefined;
            }
            return binary(equals(valueExpression, ts.factory.createNull()), ts.SyntaxKind.BarBarToken, innerShape);
        }
        case 'optional': {
            const innerShape = tryShape(ir.inner, valueExpression, strictLevels, state);
            if (innerShape === undefined) {
                return undefined;
            }
            return binary(equals(valueExpression, undefinedExpression), ts.SyntaxKind.BarBarToken, innerShape);
        }
        case 'default': {
            // Fast path delegates to the inner's shape check. Undefined inputs (where the default would fire)
            // must fail the shape and route to the slow path, which applies the default; when the inner shape
            // itself accepts undefined, that needs an explicit non-undefined guard.
            const innerShape = tryShape(ir.inner, valueExpression, strictLevels, state);
            if (innerShape === undefined) {
                return undefined;
            }
            if (shapeMatchesUndefined(ir.inner)) {
                return binary(
                    notEquals(valueExpression, undefinedExpression),
                    ts.SyntaxKind.AmpersandAmpersandToken,
                    innerShape,
                );
            }
            return innerShape;
        }
        case 'refine': {
            const innerShape = tryShape(ir.inner, valueExpression, strictLevels, state);
            if (innerShape === undefined) {
                return undefined;
            }
            // Hoist the predicate via the same path the slow accumulator uses; `getOrCreateCallback` dedups via
            // `state.callbackCache`, so both call sites share an identifier. If the predicate's free identifiers
            // can't be resolved, bail to the slow path so the user sees a single canonical error there.
            const inputType = emitType(ir.inner);
            let predicateIdentifier: ts.Identifier;
            try {
                predicateIdentifier = getOrCreateCallback(
                    ir.callback,
                    state,
                    'refine',
                    functionType(inputType, booleanType),
                );
            } catch (error) {
                if (error instanceof ResolutionError) {
                    return undefined;
                }
                throw error;
            }
            return binary(
                innerShape,
                ts.SyntaxKind.AmpersandAmpersandToken,
                call(predicateIdentifier, [castTo(valueExpression, inputType)]),
            );
        }
        case 'enum': {
            const setIdentifier = hoistEnum(state, ir.values);
            return call(property(setIdentifier, 'has'), [valueExpression]);
        }
        case 'union': {
            // A member containing a reachable default has an under-matching shape: false while the runtime would
            // match it (applying the default). In an OR-chain that lets a LATER member accept the input unmodified
            // when the runtime returns the earlier member's defaulted value — so bail the whole union.
            if (ir.members.some((member) => containsReachableDefault(member, state, new Set()))) {
                return undefined;
            }
            // Members get fresh strictLevels, folded into each member's own expression: we don't know which member
            // will match at codegen time, so member-specific extras counts can't aggregate with the parent's. A
            // member whose extras check fails simply doesn't match, and the next member (or the slow path) runs —
            // the same first-match semantics as the runtime's try-each.
            const memberShapes: ts.Expression[] = [];
            for (const member of ir.members) {
                const memberShape = tryShapeSelfContained(member, valueExpression, state);
                if (memberShape === undefined) {
                    return undefined;
                }
                memberShapes.push(memberShape);
            }
            let result: ts.Expression = memberShapes[0];
            for (let index = 1; index < memberShapes.length; index++) {
                result = binary(result, ts.SyntaxKind.BarBarToken, memberShapes[index]);
            }
            return result;
        }
        case 'record': {
            const elementParameter = freshIdentifier(state, 'el');
            const scoped = withScopedDepth(state, () => tryShapeSelfContained(ir.element, elementParameter, state));
            if (scoped === undefined) {
                return undefined;
            }
            const threading = depthThreading(scoped, state);
            if (threading === undefined) {
                return undefined;
            }
            const objectParameter = freshIdentifier(state, 'obj');
            const keyIdentifier = freshIdentifier(state, 'k');
            const forInLoop = forIn(keyIdentifier, objectParameter, [
                constStatement(elementParameter, undefined, elementAccess(objectParameter, keyIdentifier)),
                ifStatement(not(scoped.result), [returnStatement(falseLiteral)]),
            ]);
            const helperName = emitShapeHelper(
                state,
                'shapeRecord',
                [
                    {
                        name: objectParameter,
                        type: factory.createTypeReferenceNode('Record', [
                            factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                            unknownType,
                        ]),
                    },
                    ...threading.parameters,
                ],
                [forInLoop, returnStatement(trueLiteral)],
            );
            // `isPlainObject` (always spliced for record schemas) gates the shape; the hoisted helper iterates the
            // unknown-key set. Call the spliced predicate so it stays in lockstep with paseri-lib's check.
            const result = binary(
                call(identifier('isPlainObject'), [valueExpression]),
                ts.SyntaxKind.AmpersandAmpersandToken,
                call(helperName, [valueExpression, ...threading.callArguments]),
            );
            return result;
        }
        case 'set': {
            const elementParameter = freshIdentifier(state, 'el');
            const scoped = withScopedDepth(state, () => tryShapeSelfContained(ir.element, elementParameter, state));
            if (scoped === undefined) {
                return undefined;
            }
            const threading = depthThreading(scoped, state);
            if (threading === undefined) {
                return undefined;
            }
            const setParameter = freshIdentifier(state, 'set');
            const forOfLoop = forOf(elementParameter, setParameter, [
                ifStatement(not(scoped.result), [returnStatement(falseLiteral)]),
            ]);
            const helperName = emitShapeHelper(
                state,
                'shapeSet',
                [
                    { name: setParameter, type: factory.createTypeReferenceNode('Set', [unknownType]) },
                    ...threading.parameters,
                ],
                [forOfLoop, returnStatement(trueLiteral)],
            );
            let result: ts.Expression = instanceOf(valueExpression, identifier('Set'));
            for (const check of ir.checks) {
                const op =
                    check.name === 'min' ? ts.SyntaxKind.GreaterThanEqualsToken : ts.SyntaxKind.LessThanEqualsToken;
                result = binary(
                    result,
                    ts.SyntaxKind.AmpersandAmpersandToken,
                    binary(property(valueExpression, 'size'), op, numericLiteral(check.value)),
                );
            }
            result = binary(
                result,
                ts.SyntaxKind.AmpersandAmpersandToken,
                call(helperName, [valueExpression, ...threading.callArguments]),
            );
            return result;
        }
        case 'map': {
            const keyParameter = freshIdentifier(state, 'mk');
            const valueElementParameter = freshIdentifier(state, 'mv');
            // Key and value shapes share one depth scope — they live in the same hoisted helper.
            const scoped = withScopedDepth(state, () => {
                const keyShape = tryShapeSelfContained(ir.key, keyParameter, state);
                if (keyShape === undefined) {
                    return undefined;
                }
                const valueShape = tryShapeSelfContained(ir.value, valueElementParameter, state);
                if (valueShape === undefined) {
                    return undefined;
                }
                return { keyShape, valueShape };
            });
            if (scoped === undefined) {
                return undefined;
            }
            const threading = depthThreading(scoped, state);
            if (threading === undefined) {
                return undefined;
            }
            const mapParameter = freshIdentifier(state, 'm');
            const entryParameter = freshIdentifier(state, 'entry');
            // Array access rather than destructuring because the forOf builder
            // takes a single Identifier; cost is equal.
            const forOfLoop = forOf(entryParameter, mapParameter, [
                constStatement(keyParameter, undefined, elementAccess(entryParameter, numericLiteral(0))),
                constStatement(valueElementParameter, undefined, elementAccess(entryParameter, numericLiteral(1))),
                ifStatement(not(scoped.result.keyShape), [returnStatement(falseLiteral)]),
                ifStatement(not(scoped.result.valueShape), [returnStatement(falseLiteral)]),
            ]);
            const helperName = emitShapeHelper(
                state,
                'shapeMap',
                [
                    { name: mapParameter, type: factory.createTypeReferenceNode('Map', [unknownType, unknownType]) },
                    ...threading.parameters,
                ],
                [forOfLoop, returnStatement(trueLiteral)],
            );
            let result: ts.Expression = instanceOf(valueExpression, identifier('Map'));
            for (const check of ir.checks) {
                const op =
                    check.name === 'min' ? ts.SyntaxKind.GreaterThanEqualsToken : ts.SyntaxKind.LessThanEqualsToken;
                result = binary(
                    result,
                    ts.SyntaxKind.AmpersandAmpersandToken,
                    binary(property(valueExpression, 'size'), op, numericLiteral(check.value)),
                );
            }
            result = binary(
                result,
                ts.SyntaxKind.AmpersandAmpersandToken,
                call(helperName, [valueExpression, ...threading.callArguments]),
            );
            return result;
        }
        case 'array': {
            const elementParameter = freshIdentifier(state, 'el');
            const scoped = withScopedDepth(state, () => tryShapeSelfContained(ir.element, elementParameter, state));
            if (scoped === undefined) {
                return undefined;
            }
            const threading = depthThreading(scoped, state);
            if (threading === undefined) {
                return undefined;
            }
            // Hoisted helper + indexed for-loop. V8 inlines a monomorphic call
            // to a small hot module-scope helper, giving for-loop perf without
            // bloating the wrapper. (Inline arrows via Array.prototype.every
            // are much slower.)
            const arrayParameter = freshIdentifier(state, 'arr');
            const indexIdentifier = freshIdentifier(state, 'i');
            const loopBody = block([
                constStatement(elementParameter, undefined, elementAccess(arrayParameter, indexIdentifier)),
                ifStatement(not(scoped.result), [returnStatement(falseLiteral)]),
            ]);
            const forLoop = factory.createForStatement(
                factory.createVariableDeclarationList(
                    [factory.createVariableDeclaration(indexIdentifier, undefined, undefined, numericLiteral(0))],
                    ts.NodeFlags.Let,
                ),
                binary(indexIdentifier, ts.SyntaxKind.LessThanToken, property(arrayParameter, 'length')),
                factory.createPostfixUnaryExpression(indexIdentifier, ts.SyntaxKind.PlusPlusToken),
                loopBody,
            );
            const helperName = emitShapeHelper(
                state,
                'shapeArray',
                [{ name: arrayParameter, type: factory.createArrayTypeNode(unknownType) }, ...threading.parameters],
                [forLoop, returnStatement(trueLiteral)],
            );
            let result: ts.Expression = call(property(identifier('Array'), 'isArray'), [valueExpression]);
            for (const check of ir.checks) {
                const op =
                    check.name === 'min' ? ts.SyntaxKind.GreaterThanEqualsToken : ts.SyntaxKind.LessThanEqualsToken;
                result = binary(
                    result,
                    ts.SyntaxKind.AmpersandAmpersandToken,
                    binary(property(valueExpression, 'length'), op, numericLiteral(check.value)),
                );
            }
            result = binary(
                result,
                ts.SyntaxKind.AmpersandAmpersandToken,
                call(helperName, [valueExpression, ...threading.callArguments]),
            );
            return result;
        }
        case 'tuple': {
            let result: ts.Expression = call(property(identifier('Array'), 'isArray'), [valueExpression]);
            result = binary(
                result,
                ts.SyntaxKind.AmpersandAmpersandToken,
                binary(
                    property(valueExpression, 'length'),
                    ts.SyntaxKind.EqualsEqualsEqualsToken,
                    numericLiteral(ir.elements.length),
                ),
            );
            for (let index = 0; index < ir.elements.length; index++) {
                const elementExpression = elementAccess(valueExpression, numericLiteral(index));
                const elementShape = tryShape(ir.elements[index], elementExpression, strictLevels, state);
                if (elementShape === undefined) {
                    return undefined;
                }
                result = binary(result, ts.SyntaxKind.AmpersandAmpersandToken, elementShape);
            }
            return result;
        }
        case 'object': {
            const fields = Object.entries(ir.fields);
            // Field-kind filtering is handled by the recursive `tryShape` call
            // below — anything that can modify its value (default / refine /
            // chain / ref) falls into the switch's `default` arm and returns
            // undefined, which bails this branch too. We don't gate on
            // `canModify` here because nested strip-mode objects only mutate
            // when extras are present, and the wrapper's extras-detection
            // pass already routes that case to the slow function.
            for (const [name] of fields) {
                if (PROTOTYPE_NAMES.has(name)) {
                    return undefined;
                }
            }
            // A reconstructed strip object reconstructs its strip fields too (suppressing their loops in turn). A
            // strict/passthrough object is kept by reference, so its fields are not — `thisReconstructed` is false.
            const thisReconstructed = reconstructing && isReconstructableStripObject(ir);
            // `isPlainObject` (always spliced for object schemas) gates the shape, then each field's inline check.
            // Call the spliced predicate so it stays in lockstep with paseri-lib (the constructor / Array.isArray
            // cases are easy to miss when re-inlined).
            let result: ts.Expression = call(identifier('isPlainObject'), [valueExpression]);
            for (const [fieldName, fieldIR] of fields) {
                const fieldExpression = recordAccess(valueExpression, stringLiteral(fieldName));
                state.reconstructingStrip = thisReconstructed;
                const fieldShape = tryShape(fieldIR, fieldExpression, strictLevels, state);
                if (fieldShape === undefined) {
                    return undefined;
                }
                if (!isFieldOptional(fieldIR) && shapeMatchesUndefined(fieldIR)) {
                    // A required field whose shape accepts undefined would otherwise match an absent key
                    // (`value["k"]` reads undefined); require presence explicitly. Prototype-name fields are
                    // rejected above, so `in` can't hit an inherited key.
                    result = binary(
                        result,
                        ts.SyntaxKind.AmpersandAmpersandToken,
                        binary(stringLiteral(fieldName), ts.SyntaxKind.InKeyword, recordCast(valueExpression)),
                    );
                }
                result = binary(result, ts.SyntaxKind.AmpersandAmpersandToken, fieldShape);
            }
            // A reconstructed strip object needs no count loop (the rebuild drops unknown keys). Strict objects and
            // non-reconstructed strip objects still push a level for the caller's extras pass.
            if (ir.mode === 'strict' || (ir.mode === 'strip' && !thisReconstructed)) {
                const optionalFieldNames: string[] = [];
                let requiredCount = 0;
                for (const [fieldName, fieldIR] of fields) {
                    if (isFieldOptional(fieldIR)) {
                        optionalFieldNames.push(fieldName);
                    } else {
                        requiredCount += 1;
                    }
                }
                strictLevels.push({ valueExpression, requiredCount, optionalFieldNames });
            }
            return result;
        }
        case 'ref': {
            // `maxDepth` is always in scope when the graph has refs; the guard is defensive.
            if (state.maxDepthIdentifier === undefined) {
                return undefined;
            }
            if (!state.cyclicNames.has(ir.name)) {
                // Acyclic (forward-reference / shared) target: inline its shape with the boundary as a
                // `depth < maxDepth` conjunct (omitted at the statically-dead entry depth 0). A false routes to
                // the slow path, whose inlined statement form reports `too_deep` at the same depth.
                const target = state.namedIRs[ir.name];
                const savedDepth = state.currentDepth;
                state.currentDepth = incrementDepth(savedDepth);
                const targetShape = tryShapeSelfContained(target, valueExpression, state);
                state.currentDepth = savedDepth;
                if (targetShape === undefined) {
                    return undefined;
                }
                if (isZeroDepth(savedDepth)) {
                    return targetShape;
                }
                if (!ts.isNumericLiteral(savedDepth)) {
                    // The conjunct references a scoped depth parameter (inside a container helper or a cyclic
                    // function); count it so the helper threads (depth, maxDepth) through its signature.
                    state.refShapeUses += 1;
                }
                return binary(
                    binary(savedDepth, ts.SyntaxKind.LessThanToken, state.maxDepthIdentifier),
                    ts.SyntaxKind.AmpersandAmpersandToken,
                    targetShape,
                );
            }
            // Cyclic target: delegate to a hoisted boolean helper mirroring the named function's depth accounting.
            const helperName = getOrCreateRefShapeHelper(ir.name, state);
            if (helperName === undefined) {
                return undefined;
            }
            state.refShapeUses += 1;
            return call(helperName, [valueExpression, state.currentDepth, state.maxDepthIdentifier]);
        }
        default:
            return undefined;
    }
}

export {
    containsReachableDefault,
    normalizeShapeHelper,
    shapeMatchesUndefined,
    tryShape,
    tryShapeSelfContained,
    withShapeAttempt,
};
