import type { IR } from '@vbudovski/paseri/introspect';
import ts from 'typescript';
import {
    binary,
    block,
    breakStatement,
    call,
    equals,
    ifStatement,
    labeled,
    not,
    numericLiteral,
    property,
    stringLiteral,
    typeofExpression,
} from '../builders.ts';
import { emitFailureRouting, emitTypeCheckedBlock, leafExpression } from '../issues.ts';
import { freshIdentifier, hoistRegex, type Sink, type State } from '../state.ts';

type StringIR = Extract<IR, { kind: 'string' }>;
type StringCheck = StringIR['checks'][number];

/**
 * Issue codes for the regex-based check arms of a string schema. The check
 * name selects the issue; the check's `.source` / `.flags` produce the RegExp.
 */
const REGEX_ISSUE_BY_NAME: Record<string, string> = {
    email: 'invalid_email',
    emoji: 'invalid_emoji',
    uuid: 'invalid_uuid',
    nanoid: 'invalid_nanoid',
    date: 'invalid_date_string',
    time: 'invalid_time_string',
    datetime: 'invalid_date_time_string',
    ip: 'invalid_ip_address',
    cidr: 'invalid_ip_address_range',
    regex: 'does_not_match_regex',
};

/**
 * Builds `regex.test(value)`. For global/sticky regexes (`g`/`y` flags) `test` advances `lastIndex` across calls, so
 * it is reset to 0 first via a comma expression; non-stateful regexes get a bare call (no dead store). Shared by the
 * return-sink arm here and the object fast-path shape check so both apply the same reset policy; without it, every
 * other valid call for a stateful regex would fall to the slow path.
 */
function regexTestExpression(regex: ts.Expression, valueExpression: ts.Expression, flags: string): ts.Expression {
    const test = call(property(regex, 'test'), [valueExpression]);
    if (!flags.includes('g') && !flags.includes('y')) {
        return test;
    }
    return binary(
        binary(property(regex, 'lastIndex'), ts.SyntaxKind.EqualsToken, numericLiteral(0)),
        ts.SyntaxKind.CommaToken,
        test,
    );
}

function checkExpression(
    check: StringCheck,
    valueExpression: ts.Expression,
    state: State,
): [ts.Expression, ts.Expression] {
    switch (check.name) {
        case 'min':
            return [
                binary(
                    property(valueExpression, 'length'),
                    ts.SyntaxKind.GreaterThanEqualsToken,
                    numericLiteral(check.value),
                ),
                leafExpression('too_short'),
            ];
        case 'max':
            return [
                binary(
                    property(valueExpression, 'length'),
                    ts.SyntaxKind.LessThanEqualsToken,
                    numericLiteral(check.value),
                ),
                leafExpression('too_long'),
            ];
        case 'includes':
            return [
                call(property(valueExpression, 'includes'), [stringLiteral(check.value)]),
                leafExpression('does_not_include'),
            ];
        case 'startsWith':
            return [
                call(property(valueExpression, 'startsWith'), [stringLiteral(check.value)]),
                leafExpression('does_not_start_with'),
            ];
        case 'endsWith':
            return [
                call(property(valueExpression, 'endsWith'), [stringLiteral(check.value)]),
                leafExpression('does_not_end_with'),
            ];
        default: {
            // Hoist the RegExp to module scope (compiled once at load), deduplicated by source+flags so the
            // fast-path and return-sink arms of one field — and identical regexes across fields — share one instance.
            const regex = hoistRegex(state, check.source, check.flags);
            const code = REGEX_ISSUE_BY_NAME[check.name];
            return [regexTestExpression(regex, valueExpression, check.flags), leafExpression(code)];
        }
    }
}

function checkBody(ir: StringIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    if (ir.checks.length === 0) {
        return [];
    }
    if (sink.kind === 'return') {
        return ir.checks.flatMap((check) => {
            const [condition, issue] = checkExpression(check, valueExpression, state);
            return [ifStatement(not(condition), [emitFailureRouting(issue, sink)])];
        });
    }
    // Accumulate sink: the first failing check short-circuits the rest
    // (matches Paseri's runtime behaviour within a primitive).
    const label = freshIdentifier(state, 'labelCheck');
    const innerStatements: ts.Statement[] = [];
    for (const check of ir.checks) {
        const [condition, issue] = checkExpression(check, valueExpression, state);
        innerStatements.push(ifStatement(not(condition), [emitFailureRouting(issue, sink), breakStatement(label)]));
    }
    return [labeled(label, block(innerStatements))];
}

function emitString(ir: StringIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    return [
        emitTypeCheckedBlock(
            equals(typeofExpression(valueExpression), stringLiteral('string')),
            leafExpression('invalid_type', { expected: stringLiteral('string') }),
            checkBody(ir, valueExpression, sink, state),
            sink,
        ),
    ];
}

export { emitString, regexTestExpression };
