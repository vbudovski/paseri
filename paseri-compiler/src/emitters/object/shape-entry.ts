import type { IR } from '@paseri/paseri/introspect';
import ts from 'typescript';
import {
    assign,
    assignOwnProperty,
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
    not,
    notEquals,
    nullExpression,
    numericLiteral,
    objectLiteral,
    postfixIncrement,
    recordAccess,
    recordCast,
    recordType,
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
import {
    type FieldIR,
    isFieldOptional,
    isReconstructableStripObject,
    PROTOTYPE_NAMES,
    SHAPE_ENTRY_ELIGIBLE_KINDS,
    type StrictLevel,
} from './common.ts';
import { containsReachableDefault, shapeMatchesUndefined, tryShape, withShapeAttempt } from './shape.ts';

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
    for (const { valueExpression: levelValue, requiredCount, optionalFieldNames } of strictLevels) {
        const countIdentifier = freshIdentifier(state, 'count');
        const keyIdentifier = freshIdentifier(state, 'k');
        statements.push(letStatement(countIdentifier, undefined, numericLiteral(0)));
        statements.push(forIn(keyIdentifier, levelValue, [expressionStatement(postfixIncrement(countIdentifier))]));
        // Extras threshold: the required fields (all present once the shape check passes) plus the optional fields
        // that are actually present. Comparing against the static field count would accept an unknown key whenever an
        // optional field is absent — its missing slot leaves room for the extra without the key count exceeding it.
        let threshold: ts.Expression = numericLiteral(requiredCount);
        for (const fieldName of optionalFieldNames) {
            threshold = binary(
                threshold,
                ts.SyntaxKind.PlusToken,
                ternary(
                    notEquals(recordAccess(levelValue, stringLiteral(fieldName)), undefinedExpression),
                    numericLiteral(1),
                    numericLiteral(0),
                ),
            );
        }
        statements.push(
            ifStatement(binary(countIdentifier, ts.SyntaxKind.GreaterThanToken, threshold), [slowFallback]),
        );
    }
    statements.push(successReturn);
    return statements;
}

type MemberPlan = { readonly shape: ts.Expression; readonly strictLevels: StrictLevel[] };

/**
 * Union fast path. Two forms, tried in order:
 *
 * Discriminated dispatch (every member an object sharing a literal key with distinct values): `switch` on the key —
 * O(1) to reach the matching member. A member's shape failing routes to the slow call, never to a sibling, so
 * under-matching shapes (members containing a `.default()`) are sound here.
 *
 * Sequential per-member blocks otherwise: `if (member_shape) <extras check + success>` per member, falling through
 * to the next member and finally the slow call — the runtime's first-match semantics. Fallthrough makes
 * under-matching shapes unsound (a later member would accept input the runtime resolves via an earlier member's
 * default), so the usable run of members stops at the first default-containing or unshapeable member; with no
 * leading run there's nothing to gain, and when the run covers every member without extras handling the caller's
 * cheaper OR-chain form (tryShape's `case 'union'` arm) is used instead.
 */
function tryEmitUnionShapeEntryBody(
    ir: Extract<IR, { kind: 'union' }>,
    valueExpression: ts.Expression,
    slowCall: ts.Statement,
    state: State,
): ts.Statement[] | undefined {
    const discriminator = findDiscriminator(ir);
    if (discriminator?.cases.every((entry) => isSwitchSafe(entry.value))) {
        // One transactional attempt for the whole switch: if any member turns out unshapeable, every plan's hoisted
        // helpers roll back rather than lingering as dead module code.
        const dispatchStatements = withShapeAttempt(state, () => {
            const plans: MemberPlan[] = [];
            for (const member of ir.members) {
                const memberStrictLevels: StrictLevel[] = [];
                const memberShape = tryShape(member, valueExpression, memberStrictLevels, state);
                if (memberShape === undefined) {
                    return undefined;
                }
                plans.push({ shape: memberShape, strictLevels: memberStrictLevels });
            }
            const successReturn = returnStatement(undefinedExpression);
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
        });
        if (dispatchStatements !== undefined) {
            return dispatchStatements;
        }
    }
    const prefixPlans: MemberPlan[] = [];
    let sawCutoff = false;
    for (const member of ir.members) {
        // Check for defaults BEFORE generating the member's shape: a default-containing member never participates
        // in the sequential form, and generating its shape first would hoist helpers that go dead when it's cut.
        if (containsReachableDefault(member, state, new Set())) {
            sawCutoff = true;
            break;
        }
        const plan = withShapeAttempt(state, () => {
            const memberStrictLevels: StrictLevel[] = [];
            const memberShape = tryShape(member, valueExpression, memberStrictLevels, state);
            if (memberShape === undefined) {
                return undefined;
            }
            return { shape: memberShape, strictLevels: memberStrictLevels };
        });
        if (plan === undefined) {
            sawCutoff = true;
            break;
        }
        prefixPlans.push(plan);
    }
    if (prefixPlans.length === 0) {
        return undefined;
    }
    if (!sawCutoff && prefixPlans.every((plan) => plan.strictLevels.length === 0)) {
        return undefined;
    }
    const successReturn = returnStatement(undefinedExpression);
    const memberBlocks: ts.Statement[] = [];
    for (const plan of prefixPlans) {
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
 * pushes no nested extras level (so the present case needs no slow handling either). A strict parent's own extras are
 * caught by the count check below, but any nested strict/strip sibling's extras level makes the parent defer to the
 * generic path. Only top-level defaults are handled — nested defaults stay on the generic path (their absent case
 * correctly routes to slow, which applies them).
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
    const defaults: { readonly key: string; readonly accessor: ts.Expression; readonly identifier: ts.Identifier }[] =
        [];
    const optionalFieldNames: string[] = [];
    let requiredCount = 0;
    // Gate with the spliced `isPlainObject` (as tryShape's object arm does), not a bespoke typeof + prototype
    // check — the latter accepts a plain-looking object whose own `constructor` is undefined, which the runtime
    // rejects. `isPlainObject` also subsumes the prototype/array guards, so no separate proto check is appended.
    let shape: ts.Expression = call(identifier('isPlainObject'), [valueExpression]);
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
            defaults.push({ key: fieldName, accessor, identifier: registerDefault(state, fieldIR.value) });
            optionalFieldNames.push(fieldName);
        } else {
            if (modifies(fieldIR, state)) {
                return undefined;
            }
            const fieldShape = tryShape(fieldIR, accessor, strictLevels, state);
            if (fieldShape === undefined) {
                return undefined;
            }
            if (!isFieldOptional(fieldIR) && shapeMatchesUndefined(fieldIR)) {
                // Same presence guard as tryShape's object arm: a required field whose shape accepts undefined
                // must not treat an absent key as matching.
                shape = binary(
                    shape,
                    ts.SyntaxKind.AmpersandAmpersandToken,
                    binary(stringLiteral(fieldName), ts.SyntaxKind.InKeyword, recordCast(valueExpression)),
                );
            }
            shape = binary(shape, ts.SyntaxKind.AmpersandAmpersandToken, fieldShape);
            if (isFieldOptional(fieldIR)) {
                optionalFieldNames.push(fieldName);
            } else {
                requiredCount += 1;
            }
        }
    }
    if (defaults.length === 0) {
        return undefined;
    }
    const outputType = emitType(ir);
    // Strip + default fold: emit the OUTER object as a static-key literal — its own unknown keys drop out by
    // construction, absent defaults fill inline, one allocation. A nested strict/strip sibling records an extras
    // level during the field walk that the literal rebuild can't honour, so defer the whole object to the generic
    // path (which validates nested extras correctly) rather than fast-folding it.
    if (ir.mode === 'strip') {
        if (strictLevels.length > 0) {
            return undefined;
        }
        const defaultIdentifiers = new Map(defaults.map((entry) => [entry.key, entry.identifier]));
        const props: Record<string, ts.Expression> = {};
        for (const [fieldName] of fields) {
            const accessor = recordAccess(valueExpression, stringLiteral(fieldName));
            const defaultIdentifier = defaultIdentifiers.get(fieldName);
            props[fieldName] =
                defaultIdentifier === undefined
                    ? accessor
                    : ternary(equals(accessor, undefinedExpression), defaultIdentifier, accessor);
        }
        return [ifStatement(shape, [returnStatement(successPayload(objectLiteral(props), outputType))]), slowCall];
    }
    // A nested strict/strip sibling's extras level: defer the whole object to the generic path (as the strip branch
    // above does), rather than folding its count loop into this fast path. Only the outer strict level below stays.
    if (strictLevels.length > 0) {
        return undefined;
    }
    if (ir.mode === 'strict') {
        strictLevels.push({ valueExpression, requiredCount, optionalFieldNames });
    }
    // On success: if any default field is absent, clone the value and fill in the absent defaults; otherwise the
    // value is already complete, so return it untouched (no allocation on the all-present happy path).
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
                assign(elementAccess(outIdentifier, stringLiteral(entry.key)), entry.identifier),
            ]),
        );
    }
    applyStatements.push(returnStatement(successPayload(outIdentifier, outputType)));
    const successReturn = block([ifStatement(anyAbsent, applyStatements), returnStatement(undefinedExpression)]);
    const successStatements = buildSuccessWithExtrasCheck(strictLevels, successReturn, slowCall, state);
    return [ifStatement(shape, successStatements), slowCall];
}

type OutputField = {
    readonly name: string;
    readonly local: ts.Identifier;
    readonly optional: boolean;
    readonly ir: FieldIR;
};

/**
 * The output value for one validated field. A reconstructable strip object is rebuilt as a static-key literal of its
 * fields (recursively), dropping unknown keys by construction — the count loop `tryShape` suppressed for it. Anything
 * else is kept by reference. Descends exactly the objects `tryShape` suppressed, keeping the two in lockstep.
 */
function reconstructStripValue(ir: FieldIR, access: ts.Expression): ts.Expression {
    if (ir.kind !== 'object' || !isReconstructableStripObject(ir)) {
        return access;
    }
    const props: Record<string, ts.Expression> = {};
    for (const [name, sub] of Object.entries(ir.fields)) {
        props[name] = reconstructStripValue(sub, recordAccess(access, stringLiteral(name)));
    }
    return objectLiteral(props);
}

/**
 * Strip-mode success: build the output from validated field locals rather than returning the original. Required keys
 * form a static-key literal; optionals are written only when present (`"k" in value`). Nested strip objects are
 * rebuilt via {@linkcode reconstructStripValue}.
 */
function emitStripSuccess(
    outputFields: readonly OutputField[],
    valueExpression: ts.Expression,
    outputType: ts.TypeNode,
    state: State,
): ts.Statement {
    const requiredProps: Record<string, ts.Expression> = {};
    const optionalFields: OutputField[] = [];
    for (const field of outputFields) {
        if (field.optional) {
            optionalFields.push(field);
        } else {
            requiredProps[field.name] = reconstructStripValue(field.ir, field.local);
        }
    }
    if (optionalFields.length === 0) {
        return returnStatement(successPayload(objectLiteral(requiredProps), outputType));
    }
    const outIdentifier = freshIdentifier(state, 'out');
    const statements: ts.Statement[] = [constStatement(outIdentifier, recordType, objectLiteral(requiredProps))];
    for (const field of optionalFields) {
        statements.push(
            ifStatement(binary(stringLiteral(field.name), ts.SyntaxKind.InKeyword, recordCast(valueExpression)), [
                assignOwnProperty(outIdentifier, field.name, reconstructStripValue(field.ir, field.local)),
            ]),
        );
    }
    statements.push(returnStatement(successPayload(outIdentifier, outputType)));
    return block(statements);
}

/**
 * Statement-form shape check for a top-level object entry: each field is read once into a local and its shape
 * expression tests that local, replacing the giant-boolean form whose conjuncts re-load the property for every
 * check. Same match semantics — a failing check routes to the slow call exactly like a false conjunct — and
 * field shapes still come from `tryShape`, so nested structure, strict levels, and the bail conditions
 * (prototype-name fields, unshapeable field) match the expression form.
 */
function tryEmitObjectShapeEntryBody(
    ir: Extract<IR, { kind: 'object' }>,
    valueExpression: ts.Expression,
    slowCall: ts.Statement,
    state: State,
): ts.Statement[] | undefined {
    const fields = Object.entries(ir.fields);
    for (const [name] of fields) {
        if (PROTOTYPE_NAMES.has(name)) {
            return undefined;
        }
    }
    const strictLevels: StrictLevel[] = [];
    const statements: ts.Statement[] = [
        ifStatement(not(call(identifier('isPlainObject'), [valueExpression])), [slowCall]),
    ];
    const optionalFieldNames: string[] = [];
    let requiredCount = 0;
    const outputFields: OutputField[] = [];
    // Only a strip entry rebuilds its output, so only it can reconstruct a nested strip field (and suppress its count
    // loop); strict/passthrough entries return the input by reference.
    const reconstructStrip = ir.mode === 'strip';
    for (const [fieldName, fieldIR] of fields) {
        const optional = isFieldOptional(fieldIR);
        if (!optional && shapeMatchesUndefined(fieldIR)) {
            // Same presence guard as tryShape's object arm: a required field whose shape accepts undefined must
            // not treat an absent key as matching. Prototype-name fields are rejected above, so `in` is safe.
            statements.push(
                ifStatement(
                    not(binary(stringLiteral(fieldName), ts.SyntaxKind.InKeyword, recordCast(valueExpression))),
                    [slowCall],
                ),
            );
        }
        const fieldLocal = freshIdentifier(state, 'field');
        state.reconstructingStrip = reconstructStrip;
        const fieldShape = tryShape(fieldIR, fieldLocal, strictLevels, state);
        if (fieldShape === undefined) {
            return undefined;
        }
        statements.push(
            constStatement(fieldLocal, undefined, recordAccess(valueExpression, stringLiteral(fieldName))),
            ifStatement(not(fieldShape), [slowCall]),
        );
        outputFields.push({ name: fieldName, local: fieldLocal, optional, ir: fieldIR });
        if (optional) {
            optionalFieldNames.push(fieldName);
        } else {
            requiredCount += 1;
        }
    }
    const outputType = emitType(ir);
    let successReturn: ts.Statement;
    if (ir.mode === 'strip') {
        // Always-copy: top-level extras are excluded by construction, so no top-level count is pushed. Nested
        // strict/strip levels keep their count checks below, so every field local copied here is already clean.
        successReturn = emitStripSuccess(outputFields, valueExpression, outputType, state);
    } else {
        if (ir.mode === 'strict') {
            strictLevels.push({ valueExpression, requiredCount, optionalFieldNames });
        }
        successReturn = returnStatement(undefinedExpression);
    }
    return [...statements, ...buildSuccessWithExtrasCheck(strictLevels, successReturn, slowCall, state)];
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
    // case to the slow path. Returns undefined for objects with no defaults (→ statement form below) or with
    // modifications the lean path can't handle.
    if (ir.kind === 'object') {
        const defaultStatements = withShapeAttempt(state, () =>
            tryEmitDefaultObjectEntry(ir, valueExpression, slowCall, state),
        );
        if (defaultStatements !== undefined) {
            return defaultStatements;
        }
        const statementForm = withShapeAttempt(state, () =>
            tryEmitObjectShapeEntryBody(ir, valueExpression, slowCall, state),
        );
        if (statementForm !== undefined) {
            return statementForm;
        }
    }
    // A bailed strip statement-form may leave `reconstructingStrip` set; clear it so the generic attempt shapes with
    // reconstruction off, like every other entry path.
    state.reconstructingStrip = false;
    const generic = withShapeAttempt(state, () => {
        const strictLevels: StrictLevel[] = [];
        const shape = tryShape(ir, valueExpression, strictLevels, state);
        if (shape === undefined) {
            return undefined;
        }
        return { shape, strictLevels };
    });
    if (generic === undefined) {
        return undefined;
    }
    const successReturn = returnStatement(undefinedExpression);
    const successStatements = buildSuccessWithExtrasCheck(generic.strictLevels, successReturn, slowCall, state);
    return [ifStatement(generic.shape, successStatements), slowCall];
}

export { tryEmitShapeEntryBody };
