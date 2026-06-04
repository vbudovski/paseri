import ts from 'typescript';
import {
    bigintLiteral,
    binary,
    call,
    constStatement,
    equals,
    identifier,
    ifStatement,
    instanceOf,
    literalExpression,
    not,
    numericLiteral,
    property,
    stringLiteral,
    ternary,
} from '../builders.ts';
import { emitFailureRouting, emitTypeCheckedBlock, leafExpression } from '../issues.ts';
import { freshIdentifier, hoistTemporalBound, type Sink, type State } from '../state.ts';

const { SyntaxKind } = ts;

/** Reads the comparison field values off a bound Temporal value at codegen time, in `fieldNames` order. */
function boundFieldValues(value: unknown, fieldNames: readonly string[]): number[] {
    return fieldNames.map((name) => (value as Record<string, number>)[name]);
}

/** Whether a bound Temporal value carries the `iso8601` calendar (so its field getters equal its ISO slots). */
function isIso8601(value: unknown): boolean {
    return (value as { calendarId?: unknown }).calendarId === 'iso8601';
}

/**
 * Builds a lexicographic comparison expression over a Temporal value's field getters against compile-time bound
 * literals, equivalent to `Temporal.<kind>.compare(value, bound) >= 0` (min) / `<= 0` (max) — but ONLY valid when
 * `value` carries the `iso8601` calendar, because only then do the public getters (`.year`/`.month`/`.day`/…) equal
 * the internal ISO slots that `compare` orders by. Callers guard the iso8601 case (see `emitIsoFieldTemporalSchema`).
 *
 * `fieldNames` is the comparison order (most- to least-significant, e.g. year, month, day): compare a field, and only
 * fall through to the next on an exact tie. Ordinary numeric operators make this correct across the entire ISO year
 * range, including negative years and year 0.
 */
function buildLexicographicCondition(
    valueExpression: ts.Expression,
    fieldNames: readonly string[],
    boundValues: readonly number[],
    kind: 'min' | 'max',
): ts.Expression {
    const strictOperator = kind === 'min' ? SyntaxKind.GreaterThanToken : SyntaxKind.LessThanToken;
    const inclusiveOperator = kind === 'min' ? SyntaxKind.GreaterThanEqualsToken : SyntaxKind.LessThanEqualsToken;
    function compareFrom(index: number): ts.Expression {
        if (index === fieldNames.length - 1) {
            return binary(
                property(valueExpression, fieldNames[index]),
                inclusiveOperator,
                literalExpression(boundValues[index]),
            );
        }
        // value.<field> <strict> bound || (value.<field> === bound && <compare the remaining, less-significant fields>)
        return binary(
            binary(property(valueExpression, fieldNames[index]), strictOperator, literalExpression(boundValues[index])),
            SyntaxKind.BarBarToken,
            binary(
                equals(property(valueExpression, fieldNames[index]), literalExpression(boundValues[index])),
                SyntaxKind.AmpersandAmpersandToken,
                compareFrom(index + 1),
            ),
        );
    }
    return compareFrom(0);
}

/**
 * Emits validation for a `Temporal.<temporalKind>` schema whose ordering is determined by a fixed list of integer
 * field getters (`plainDate`, `plainDateTime`, `plainTime`, `plainYearMonth`): an `instanceOf` type check plus min/max
 * bound checks.
 *
 * `Temporal.<kind>.compare` re-coerces both arguments (`ToTemporal…`) and dispatches generically on every call, so a
 * direct lexicographic compare of the value's ISO field getters against compile-time bound literals is far cheaper.
 * That field compare is only *correct* for an `iso8601` value (other calendars' getters report calendar-projected
 * fields, not the ISO slots `compare` orders by), so it is gated behind a `value.calendarId === 'iso8601'` runtime
 * guard with the exact `compare` call as the fallback. For the calendar-bearing kinds it is additionally only emitted
 * when the bound itself is `iso8601` (so the bound's getters are its ISO slots — and, for `PlainYearMonth`, which
 * exposes no day getter, so both reference days are 1, making a year/month compare exact). When `guarded` is false
 * (`plainTime`, which has no calendar) the field compare is unconditionally valid. Anything not provably equal to
 * `compare` keeps the `compare` call: correctness is never traded for speed.
 */
function emitIsoFieldTemporalSchema(
    temporalKind: string,
    fieldNames: readonly string[],
    guarded: boolean,
    checks: readonly { name: 'min' | 'max'; value: unknown }[],
    valueExpression: ts.Expression,
    sink: Sink,
    state: State,
): ts.Statement[] {
    const typeCondition = instanceOf(valueExpression, property(identifier('Temporal'), temporalKind));
    const typeFailure = leafExpression('invalid_type', { expected: stringLiteral(`Temporal.${temporalKind}`) });
    const compareFunction = property(property(identifier('Temporal'), temporalKind), 'compare');

    const anyFieldComparable = checks.some((check) => !guarded || isIso8601(check.value));
    const body: ts.Statement[] = [];

    // For the calendar-bearing kinds, read `value.calendarId === 'iso8601'` once into a local: every fast-pathed
    // check branches on it. Skipped entirely when no check qualifies (so the codegen is identical to the
    // `compare`-only form for, e.g., a non-iso8601 bound).
    let isoGuard: ts.Identifier | undefined;
    if (guarded && anyFieldComparable) {
        isoGuard = freshIdentifier(state, 'iso');
        body.push(
            constStatement(
                isoGuard,
                undefined,
                equals(property(valueExpression, 'calendarId'), stringLiteral('iso8601')),
            ),
        );
    }

    for (const check of checks) {
        const code = check.name === 'min' ? 'too_dated' : 'too_recent';
        let condition: ts.Expression;
        if (!guarded) {
            condition = buildLexicographicCondition(
                valueExpression,
                fieldNames,
                boundFieldValues(check.value, fieldNames),
                check.name,
            );
        } else {
            const boundIdentifier = hoistTemporalBound(state, temporalKind, check.value);
            const compareOperator =
                check.name === 'min' ? SyntaxKind.GreaterThanEqualsToken : SyntaxKind.LessThanEqualsToken;
            const compareFallback = binary(
                call(compareFunction, [valueExpression, boundIdentifier]),
                compareOperator,
                numericLiteral(0),
            );
            if (isoGuard !== undefined && isIso8601(check.value)) {
                const fieldCompare = buildLexicographicCondition(
                    valueExpression,
                    fieldNames,
                    boundFieldValues(check.value, fieldNames),
                    check.name,
                );
                condition = ternary(isoGuard, fieldCompare, compareFallback);
            } else {
                condition = compareFallback;
            }
        }
        body.push(ifStatement(not(condition), [emitFailureRouting(leafExpression(code), sink)]));
    }

    return [emitTypeCheckedBlock(typeCondition, typeFailure, body, sink)];
}

/**
 * Like `emitIsoFieldTemporalSchema`, but for the epoch-comparable kinds (`Instant`, `ZonedDateTime`) whose ordering is
 * fully determined by `epochNanoseconds`. `Temporal.X.compare` re-coerces both arguments and dispatches generically on
 * every call; comparing the cached `epochNanoseconds` bigint against the bound's `epochNanoseconds` literal is far
 * cheaper. The getter is read once into a local since each access allocates a fresh `BigInt`.
 */
function emitEpochTemporalSchema(
    temporalKind: string,
    checks: readonly { name: 'min' | 'max'; value: unknown }[],
    valueExpression: ts.Expression,
    sink: Sink,
    state: State,
): ts.Statement[] {
    const typeCondition = instanceOf(valueExpression, property(identifier('Temporal'), temporalKind));
    const typeFailure = leafExpression('invalid_type', { expected: stringLiteral(`Temporal.${temporalKind}`) });
    const body: ts.Statement[] = [];
    if (checks.length > 0) {
        const epochIdentifier = freshIdentifier(state, 'epoch');
        body.push(constStatement(epochIdentifier, undefined, property(valueExpression, 'epochNanoseconds')));
        for (const check of checks) {
            const bound = bigintLiteral((check.value as { epochNanoseconds: bigint }).epochNanoseconds);
            const condition =
                check.name === 'min'
                    ? binary(epochIdentifier, ts.SyntaxKind.GreaterThanEqualsToken, bound)
                    : binary(epochIdentifier, ts.SyntaxKind.LessThanEqualsToken, bound);
            const code = check.name === 'min' ? 'too_dated' : 'too_recent';
            body.push(ifStatement(not(condition), [emitFailureRouting(leafExpression(code), sink)]));
        }
    }
    return [emitTypeCheckedBlock(typeCondition, typeFailure, body, sink)];
}

export { emitEpochTemporalSchema, emitIsoFieldTemporalSchema };
