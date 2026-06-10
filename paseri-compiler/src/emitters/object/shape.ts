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
    falseLiteral,
    forIn,
    forOf,
    functionType,
    identifier,
    ifStatement,
    instanceOf,
    literalExpression,
    not,
    notEquals,
    numericLiteral,
    property,
    recordAccess,
    recordCast,
    returnStatement,
    stringLiteral,
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
import { isFieldOptional, PROTOTYPE_NAMES, type StrictLevel } from './common.ts';

const { factory } = ts;

const helperKeyPrinter = ts.createPrinter();
const helperKeySourceFile = ts.createSourceFile('_helper.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);

/**
 * Collects, in source order, the identifier names a function declaration *binds* — its own name, its parameters, and
 * every variable it declares. Free references (hoisted helper names, regexes, builtins) are deliberately excluded so
 * they survive normalisation intact.
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

/**
 * Hoists a module-scope `function <namePrefix>N(<parameter>: <type>): boolean`
 * containing `loopStatement` followed by `return true`. Returns the helper's
 * name. Used by container shape-checks (array/record/set/map) to outline a
 * tight per-element check that V8 can inline at the call site. Deduplicated by
 * normalized body, so structurally-identical helpers share one declaration.
 */
function emitShapeHelper(
    state: State,
    namePrefix: string,
    parameter: ts.Identifier,
    parameterType: ts.TypeNode,
    loopStatement: ts.Statement,
): ts.Identifier {
    const helperName = freshIdentifier(state, namePrefix);
    const helperFunction = factory.createFunctionDeclaration(
        undefined,
        undefined,
        helperName,
        undefined,
        [factory.createParameterDeclaration(undefined, undefined, parameter, undefined, parameterType)],
        factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
        block([loopStatement, returnStatement(trueLiteral)]),
    );
    const key = normalizeShapeHelper(helperFunction);
    const existing = state.shapeHelperCache.get(key);
    if (existing !== undefined) {
        return existing;
    }
    state.hoistedDeclarations.push(helperFunction);
    state.shapeHelperCache.set(key, helperName);
    return helperName;
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
            // Members get fresh strictLevels: we don't know which will match at
            // codegen time, so member-specific extras counts can't aggregate with
            // the parent's. Any member needing extras detection bails the union.
            const memberShapes: ts.Expression[] = [];
            for (const member of ir.members) {
                const memberStrictLevels: StrictLevel[] = [];
                const memberShape = tryShape(member, valueExpression, memberStrictLevels, state);
                if (memberShape === undefined) {
                    return undefined;
                }
                if (memberStrictLevels.length > 0) {
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
            const elementStrictLevels: StrictLevel[] = [];
            const elementParameter = freshIdentifier(state, 'el');
            const elementShape = tryShape(ir.element, elementParameter, elementStrictLevels, state);
            if (elementShape === undefined) {
                return undefined;
            }
            if (elementStrictLevels.length > 0) {
                return undefined;
            }
            const objectParameter = freshIdentifier(state, 'obj');
            const keyIdentifier = freshIdentifier(state, 'k');
            const forInLoop = forIn(keyIdentifier, objectParameter, [
                constStatement(elementParameter, undefined, elementAccess(objectParameter, keyIdentifier)),
                ifStatement(not(elementShape), [returnStatement(falseLiteral)]),
            ]);
            const helperName = emitShapeHelper(
                state,
                'shapeRecord',
                objectParameter,
                factory.createTypeReferenceNode('Record', [
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                    unknownType,
                ]),
                forInLoop,
            );
            // `isPlainObject` (always spliced for record schemas) gates the shape; the hoisted helper iterates the
            // unknown-key set. Call the spliced predicate so it stays in lockstep with paseri-lib's check.
            const result = binary(
                call(identifier('isPlainObject'), [valueExpression]),
                ts.SyntaxKind.AmpersandAmpersandToken,
                call(helperName, [valueExpression]),
            );
            return result;
        }
        case 'set': {
            const elementStrictLevels: StrictLevel[] = [];
            const elementParameter = freshIdentifier(state, 'el');
            const elementShape = tryShape(ir.element, elementParameter, elementStrictLevels, state);
            if (elementShape === undefined) {
                return undefined;
            }
            if (elementStrictLevels.length > 0) {
                return undefined;
            }
            const setParameter = freshIdentifier(state, 'set');
            const forOfLoop = forOf(elementParameter, setParameter, [
                ifStatement(not(elementShape), [returnStatement(falseLiteral)]),
            ]);
            const helperName = emitShapeHelper(
                state,
                'shapeSet',
                setParameter,
                factory.createTypeReferenceNode('Set', [unknownType]),
                forOfLoop,
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
            result = binary(result, ts.SyntaxKind.AmpersandAmpersandToken, call(helperName, [valueExpression]));
            return result;
        }
        case 'map': {
            const keyStrictLevels: StrictLevel[] = [];
            const keyParameter = freshIdentifier(state, 'mk');
            const keyShape = tryShape(ir.key, keyParameter, keyStrictLevels, state);
            if (keyShape === undefined) {
                return undefined;
            }
            if (keyStrictLevels.length > 0) {
                return undefined;
            }
            const valueStrictLevels: StrictLevel[] = [];
            const valueElementParameter = freshIdentifier(state, 'mv');
            const valueShape = tryShape(ir.value, valueElementParameter, valueStrictLevels, state);
            if (valueShape === undefined) {
                return undefined;
            }
            if (valueStrictLevels.length > 0) {
                return undefined;
            }
            const mapParameter = freshIdentifier(state, 'm');
            const entryParameter = freshIdentifier(state, 'entry');
            // Array access rather than destructuring because the forOf builder
            // takes a single Identifier; cost is equal.
            const forOfLoop = forOf(entryParameter, mapParameter, [
                constStatement(keyParameter, undefined, elementAccess(entryParameter, numericLiteral(0))),
                constStatement(valueElementParameter, undefined, elementAccess(entryParameter, numericLiteral(1))),
                ifStatement(not(keyShape), [returnStatement(falseLiteral)]),
                ifStatement(not(valueShape), [returnStatement(falseLiteral)]),
            ]);
            const helperName = emitShapeHelper(
                state,
                'shapeMap',
                mapParameter,
                factory.createTypeReferenceNode('Map', [unknownType, unknownType]),
                forOfLoop,
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
            result = binary(result, ts.SyntaxKind.AmpersandAmpersandToken, call(helperName, [valueExpression]));
            return result;
        }
        case 'array': {
            const elementStrictLevels: StrictLevel[] = [];
            const elementParameter = freshIdentifier(state, 'el');
            const elementShape = tryShape(ir.element, elementParameter, elementStrictLevels, state);
            if (elementShape === undefined) {
                return undefined;
            }
            // Per-element extras count can't be hoisted into the parent's
            // strictLevels (one bucket of counts can't accumulate across
            // every element of an unknown-length array), so bail.
            if (elementStrictLevels.length > 0) {
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
                ifStatement(not(elementShape), [returnStatement(falseLiteral)]),
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
                arrayParameter,
                factory.createArrayTypeNode(unknownType),
                forLoop,
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
            result = binary(result, ts.SyntaxKind.AmpersandAmpersandToken, call(helperName, [valueExpression]));
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
            // `isPlainObject` (always spliced for object schemas) gates the shape, then each field's inline check.
            // Call the spliced predicate so it stays in lockstep with paseri-lib (the constructor / Array.isArray
            // cases are easy to miss when re-inlined).
            let result: ts.Expression = call(identifier('isPlainObject'), [valueExpression]);
            for (const [fieldName, fieldIR] of fields) {
                const fieldExpression = recordAccess(valueExpression, stringLiteral(fieldName));
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
            if (ir.mode === 'strict' || ir.mode === 'strip') {
                const optionalAccessors: ts.Expression[] = [];
                let requiredCount = 0;
                for (const [fieldName, fieldIR] of fields) {
                    if (isFieldOptional(fieldIR)) {
                        optionalAccessors.push(recordAccess(valueExpression, stringLiteral(fieldName)));
                    } else {
                        requiredCount += 1;
                    }
                }
                strictLevels.push({ valueExpression, requiredCount, optionalAccessors });
            }
            return result;
        }
        default:
            return undefined;
    }
}

export { shapeMatchesUndefined, tryShape };
