import type { IR } from '@vbudovski/paseri/introspect';
import ts from 'typescript';
import {
    assign,
    binary,
    block,
    breakStatement,
    call,
    caseClause,
    constStatement,
    elementAccess,
    equals,
    expressionStatement,
    forIn,
    identifier,
    ifStatement,
    letStatement,
    literalExpression,
    notEquals,
    nullExpression,
    numericLiteral,
    postfixIncrement,
    property,
    recordAccess,
    recordCast,
    returnStatement,
    stringLiteral,
    switchStatement,
    ternary,
    typeofExpression,
    undefinedExpression,
} from '../../builders.ts';
import { modifies } from '../../can-modify.ts';
import { emitType } from '../../emit-type.ts';
import { successPayload } from '../../issues.ts';
import { freshIdentifier, registerDefault, type State } from '../../state.ts';
import { findDiscriminator } from '../union/discriminator.ts';
import { isFieldOptional, PROTOTYPE_NAMES, SHAPE_ENTRY_ELIGIBLE_KINDS, type StrictLevel } from './common.ts';
import { tryShape } from './shape.ts';

/** Whether a discriminant value can be used as a `switch` case label (strict-equality matchable as a literal). */
function isSwitchSafe(value: unknown): boolean {
    if (typeof value === 'number') {
        return !Number.isNaN(value);
    }
    return typeof value === 'string' || typeof value === 'bigint' || typeof value === 'boolean';
}

/**
 * Builds the statements that, when the surrounding shape check has matched,
 * verify no extras at any strict/strip level and only then run `successReturn`.
 * When there are no strict/strip levels this is just `[successReturn]`. With
 * levels it emits one count loop per level followed by an inline
 * `if (count > N) <slowFallback>` early-return, then runs `successReturn`
 * once all levels pass.
 *
 * `count > N` rather than `count !== N` so that schemas with optional fields
 * can have fewer keys than `N` without being routed to the slow path. If a
 * required field is missing the shape check has already failed
 * (`typeof undefined !== T`), so we only reach the count check when all
 * required fields are present; therefore `count > N` correctly identifies
 * extras.
 *
 * Direct-return form: trims ops on the success path and short-circuits
 * subsequent count loops on the extras-present path.
 */
function buildSuccessWithExtrasCheck(
    strictLevels: readonly StrictLevel[],
    successReturn: ts.Statement,
    slowFallback: ts.Statement,
    state: State,
): ts.Statement[] {
    if (strictLevels.length === 0) {
        return [successReturn];
    }
    const statements: ts.Statement[] = [];
    for (const { valueExpression: levelValue, requiredCount, optionalAccessors } of strictLevels) {
        const countIdentifier = freshIdentifier(state, 'count');
        const keyIdentifier = freshIdentifier(state, 'k');
        statements.push(letStatement(countIdentifier, undefined, numericLiteral(0)));
        statements.push(forIn(keyIdentifier, levelValue, [expressionStatement(postfixIncrement(countIdentifier))]));
        // Extras threshold: the required fields (all present once the shape check passes) plus the optional fields
        // that are actually present. Comparing against the static field count would accept an unknown key whenever an
        // optional field is absent — its missing slot leaves room for the extra without the key count exceeding it.
        let threshold: ts.Expression = numericLiteral(requiredCount);
        for (const accessor of optionalAccessors) {
            threshold = binary(
                threshold,
                ts.SyntaxKind.PlusToken,
                ternary(notEquals(accessor, undefinedExpression), numericLiteral(1), numericLiteral(0)),
            );
        }
        statements.push(
            ifStatement(binary(countIdentifier, ts.SyntaxKind.GreaterThanToken, threshold), [slowFallback]),
        );
    }
    statements.push(successReturn);
    return statements;
}

/**
 * Strict-union fast path: when a union entry has at least one member whose
 * shape pushes strict/strip levels, the single-OR-chain form can't attribute
 * extras counts to specific members. Instead, emit one `if (member_shape)`
 * block per member with its own extras check; on a mismatch (shape fails, or
 * shape matched but extras present) control falls through to the next member,
 * matching Paseri's runtime union semantics ("try each, return first
 * success"). If no member needs extras detection this returns undefined so
 * the caller falls back to the cheaper OR-chain form.
 */
function tryEmitUnionShapeEntryBody(
    ir: Extract<IR, { kind: 'union' }>,
    valueExpression: ts.Expression,
    slowCall: ts.Statement,
    state: State,
): ts.Statement[] | undefined {
    const outputType = emitType(ir);
    type MemberPlan = { readonly shape: ts.Expression; readonly strictLevels: StrictLevel[] };
    const plans: MemberPlan[] = [];
    let allShapeable = true;
    for (const member of ir.members) {
        const memberStrictLevels: StrictLevel[] = [];
        const memberShape = tryShape(member, valueExpression, memberStrictLevels, state);
        if (memberShape === undefined) {
            allShapeable = false;
            break;
        }
        plans.push({ shape: memberShape, strictLevels: memberStrictLevels });
    }
    if (!allShapeable) {
        // A member (e.g. a chain, or a refine whose predicate can't be resolved) isn't shape-checkable, so the whole
        // union would otherwise run try-each on the entry — slow for valid input, not just on rejection. Fast-path
        // the leading shape-checkable prefix instead: a leading pure member's shape match IS its full match, and the
        // union is first-match, so returning it is correct; anything not matching the prefix falls to the try-each
        // slow function over all members. With no shape-checkable prefix there's nothing to gain, so bail.
        if (plans.length === 0) {
            return undefined;
        }
        const prefixSuccess = returnStatement(successPayload(valueExpression, outputType));
        const prefixBlocks = plans.map((plan) =>
            ifStatement(plan.shape, buildSuccessWithExtrasCheck(plan.strictLevels, prefixSuccess, slowCall, state)),
        );
        return [...prefixBlocks, slowCall];
    }
    // Discriminated fast path: when every member is an object sharing a literal key with distinct values, dispatch on
    // that key with a `switch` instead of testing each member's shape in sequence — O(1) to reach the matching member
    // rather than O(members). Skipped when a discriminant value can't be a switch case label (NaN, null, etc.); those
    // fall through to the per-member form below.
    const discriminator = findDiscriminator(ir);
    if (discriminator !== undefined) {
        if (discriminator.cases.every((entry) => isSwitchSafe(entry.value))) {
            const successReturn = returnStatement(successPayload(valueExpression, outputType));
            const clauses: ts.CaseOrDefaultClause[] = plans.map((plan, index) =>
                caseClause(literalExpression(discriminator.cases[index].value as string | number | bigint | boolean), [
                    ifStatement(
                        plan.shape,
                        buildSuccessWithExtrasCheck(plan.strictLevels, successReturn, slowCall, state),
                    ),
                    breakStatement(),
                ]),
            );
            // `value[key]` throws on null/undefined, and only objects can match, so guard the discriminant read.
            const objectGuard = binary(
                equals(typeofExpression(valueExpression), stringLiteral('object')),
                ts.SyntaxKind.AmpersandAmpersandToken,
                notEquals(valueExpression, nullExpression),
            );
            const dispatch = switchStatement(recordAccess(valueExpression, stringLiteral(discriminator.key)), clauses);
            return [ifStatement(objectGuard, [dispatch]), slowCall];
        }
    }
    if (plans.every((plan) => plan.strictLevels.length === 0)) {
        // No member needs per-member extras handling — let the caller use the
        // cheaper OR-chain form via tryShape's `case 'union'` arm.
        return undefined;
    }
    const successReturn = returnStatement(successPayload(valueExpression, outputType));
    const memberBlocks: ts.Statement[] = [];
    for (const plan of plans) {
        const successStatements = buildSuccessWithExtrasCheck(plan.strictLevels, successReturn, slowCall, state);
        memberBlocks.push(ifStatement(plan.shape, successStatements));
    }
    return [...memberBlocks, slowCall];
}

/**
 * Fast path for a top-level object whose only modification is top-level `.default()` fields. The generic shape check
 * rejects an absent default field (`typeof undefined !== T`), forcing the default-firing case — the case the default
 * exists for — onto the slow for-in+switch path. Here an absent default passes (`value[k] === undefined || inner`)
 * and the defaults are applied inline on success via `{ ...value }` + per-absent-default assignment, only when at
 * least one default is actually absent (the all-present case returns `value` untouched).
 *
 * Returns undefined (caller falls back to the generic shape / slow path) unless EVERY field is fast-path-safe: no
 * prototype-name fields; no non-default field that modifies; and each default's inner is a non-modifying shape that
 * pushes no nested extras level (so the present case needs no slow handling either). Strict/strip extras still route
 * to the slow path via the count check. Only top-level defaults are handled — nested defaults stay on the generic
 * path (their absent case correctly routes to slow, which applies them).
 */
function tryEmitDefaultObjectEntry(
    ir: Extract<IR, { kind: 'object' }>,
    valueExpression: ts.Expression,
    slowCall: ts.Statement,
    state: State,
): ts.Statement[] | undefined {
    const fields = Object.entries(ir.fields);
    // No `.default()` field means this lean path can't apply — it bails at `defaults.length === 0` below. Detect that
    // up front, before running `tryShape` over the fields: those calls hoist shape-helper functions as a side effect,
    // and the caller's generic `tryShape` pass re-hoists the live set, so a late bail would leave the dry run's set as
    // dead module code.
    if (!fields.some(([, fieldIR]) => fieldIR.kind === 'default')) {
        return undefined;
    }
    for (const [name] of fields) {
        if (PROTOTYPE_NAMES.has(name)) {
            return undefined;
        }
    }
    const strictLevels: StrictLevel[] = [];
    const defaults: { readonly key: string; readonly accessor: ts.Expression; readonly id: ts.Identifier }[] = [];
    const optionalAccessors: ts.Expression[] = [];
    let requiredCount = 0;
    let shape: ts.Expression = binary(
        equals(typeofExpression(valueExpression), stringLiteral('object')),
        ts.SyntaxKind.AmpersandAmpersandToken,
        notEquals(valueExpression, nullExpression),
    );
    for (const [fieldName, fieldIR] of fields) {
        const accessor = recordAccess(valueExpression, stringLiteral(fieldName));
        if (fieldIR.kind === 'default') {
            // The present case is handled inline too, so the default's inner must be a simple non-modifying shape
            // that pushes no nested extras level.
            if (modifies(fieldIR.inner, state)) {
                return undefined;
            }
            const levelsBefore = strictLevels.length;
            const innerShape = tryShape(fieldIR.inner, accessor, strictLevels, state);
            if (innerShape === undefined || strictLevels.length !== levelsBefore) {
                return undefined;
            }
            shape = binary(
                shape,
                ts.SyntaxKind.AmpersandAmpersandToken,
                binary(equals(accessor, undefinedExpression), ts.SyntaxKind.BarBarToken, innerShape),
            );
            defaults.push({ key: fieldName, accessor, id: registerDefault(state, fieldIR.value) });
            optionalAccessors.push(accessor);
        } else {
            if (modifies(fieldIR, state)) {
                return undefined;
            }
            const fieldShape = tryShape(fieldIR, accessor, strictLevels, state);
            if (fieldShape === undefined) {
                return undefined;
            }
            shape = binary(shape, ts.SyntaxKind.AmpersandAmpersandToken, fieldShape);
            if (isFieldOptional(fieldIR)) {
                optionalAccessors.push(accessor);
            } else {
                requiredCount += 1;
            }
        }
    }
    if (defaults.length === 0) {
        return undefined;
    }
    const protoCall = (): ts.Expression => call(property(identifier('Object'), 'getPrototypeOf'), [valueExpression]);
    shape = binary(
        shape,
        ts.SyntaxKind.AmpersandAmpersandToken,
        binary(
            equals(protoCall(), property(identifier('Object'), 'prototype')),
            ts.SyntaxKind.BarBarToken,
            equals(protoCall(), nullExpression),
        ),
    );
    if (ir.mode === 'strict' || ir.mode === 'strip') {
        strictLevels.push({ valueExpression, requiredCount, optionalAccessors });
    }
    // On success: if any default field is absent, clone the value and fill in the absent defaults; otherwise the
    // value is already complete, so return it untouched (no allocation on the all-present happy path).
    const outputType = emitType(ir);
    const outIdentifier = freshIdentifier(state, 'out');
    let anyAbsent: ts.Expression = equals(defaults[0].accessor, undefinedExpression);
    for (let index = 1; index < defaults.length; index++) {
        anyAbsent = binary(anyAbsent, ts.SyntaxKind.BarBarToken, equals(defaults[index].accessor, undefinedExpression));
    }
    const applyStatements: ts.Statement[] = [
        constStatement(
            outIdentifier,
            undefined,
            ts.factory.createObjectLiteralExpression(
                [ts.factory.createSpreadAssignment(recordCast(valueExpression))],
                false,
            ),
        ),
    ];
    for (const entry of defaults) {
        applyStatements.push(
            ifStatement(equals(entry.accessor, undefinedExpression), [
                assign(elementAccess(outIdentifier, stringLiteral(entry.key)), entry.id),
            ]),
        );
    }
    applyStatements.push(returnStatement(successPayload(outIdentifier, outputType)));
    const successReturn = block([
        ifStatement(anyAbsent, applyStatements),
        returnStatement(successPayload(valueExpression, outputType)),
    ]);
    const successStatements = buildSuccessWithExtrasCheck(strictLevels, successReturn, slowCall, state);
    return [ifStatement(shape, successStatements), slowCall];
}

/**
 * Tries to emit a split pair (tiny exported entry + private slow function)
 * for object-typed entries whose structure can be expressed as a pure boolean
 * shape check. Keeps the slow function cold on the happy path. Returns
 * undefined when the IR isn't shape-checkable; caller falls back to a single
 * emitted function.
 */
function tryEmitShapeEntryBody(
    ir: IR,
    valueExpression: ts.Expression,
    slowCall: ts.Statement,
    state: State,
): ts.Statement[] | undefined {
    // Restricted to compound kinds — primitives are fast as single functions;
    // splitting adds a call without payoff on the hot path.
    if (!SHAPE_ENTRY_ELIGIBLE_KINDS.has(ir.kind)) {
        return undefined;
    }
    // Union entries: try the per-member form first; falls through to the
    // single-OR-chain form below when no member needs extras detection.
    if (ir.kind === 'union') {
        const unionStatements = tryEmitUnionShapeEntryBody(ir, valueExpression, slowCall, state);
        if (unionStatements !== undefined) {
            return unionStatements;
        }
    }
    // Objects with top-level `.default()` fields: apply the defaults inline rather than routing the default-firing
    // case to the slow path. Returns undefined for objects with no defaults (→ generic path below) or with
    // modifications the lean path can't handle.
    if (ir.kind === 'object') {
        const defaultStatements = tryEmitDefaultObjectEntry(ir, valueExpression, slowCall, state);
        if (defaultStatements !== undefined) {
            return defaultStatements;
        }
    }
    const strictLevels: StrictLevel[] = [];
    const shape = tryShape(ir, valueExpression, strictLevels, state);
    if (shape === undefined) {
        return undefined;
    }
    const outputType = emitType(ir);
    const successReturn = returnStatement(successPayload(valueExpression, outputType));
    const successStatements = buildSuccessWithExtrasCheck(strictLevels, successReturn, slowCall, state);
    return [ifStatement(shape, successStatements), slowCall];
}

export { tryEmitShapeEntryBody };
