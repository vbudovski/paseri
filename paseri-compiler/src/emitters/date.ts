import type { IR } from '@paseri/paseri/introspect';
import ts from 'typescript';
import {
    binary,
    block,
    breakStatement,
    call,
    constStatement,
    identifier,
    ifStatement,
    instanceOf,
    labeled,
    literalExpression,
    not,
    property,
    stringLiteral,
} from '../builders.ts';
import { emitFailureRouting, emitTypeCheckedBlock, leafExpression } from '../issues.ts';
import { freshIdentifier, type Sink, type State } from '../state.ts';

type DateIR = Extract<IR, { kind: 'date' }>;

function emitDate(ir: DateIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const typeFailure = leafExpression('invalid_type', { expected: stringLiteral('Date') });
    const dateFailure = leafExpression('invalid_date');
    // Read the timestamp once and compare numerically. `value >= bound` on two Date operands coerces both via
    // `Date.prototype.valueOf` every call; comparing the cached epoch-ms against the bound's epoch-ms (a constant
    // numeric literal) avoids that and lets V8 keep the comparison in fully-optimised integer code.
    const timeIdentifier = freshIdentifier(state, 'time');
    const timeDeclaration = constStatement(timeIdentifier, undefined, call(property(valueExpression, 'getTime'), []));

    // Failure-condition / issue pairs in the order the runtime checks them: invalid-date guard first, then the bounds.
    const failures: [ts.Expression, ts.Expression][] = [
        [call(property(identifier('Number'), 'isNaN'), [timeIdentifier]), dateFailure],
    ];
    for (const check of ir.checks) {
        const bound = literalExpression(check.value.getTime());
        const condition =
            check.name === 'min'
                ? binary(timeIdentifier, ts.SyntaxKind.GreaterThanEqualsToken, bound)
                : binary(timeIdentifier, ts.SyntaxKind.LessThanEqualsToken, bound);
        const code = check.name === 'min' ? 'too_dated' : 'too_recent';
        failures.push([not(condition), leafExpression(code)]);
    }

    let checkStatements: ts.Statement[];
    if (sink.kind === 'return' || failures.length === 1) {
        // Return sink short-circuits already (each routing emits a `return`); a lone guard has nothing to skip.
        checkStatements = failures.map(([failure, issue]) => ifStatement(failure, [emitFailureRouting(issue, sink)]));
    } else {
        // Accumulate sink: the first failing check short-circuits the rest (matches Paseri's runtime behaviour within a
        // primitive), so an invalid date doesn't also report a bound leaf.
        const label = freshIdentifier(state, 'labelCheck');
        const innerStatements = failures.map(([failure, issue]) =>
            ifStatement(failure, [emitFailureRouting(issue, sink), breakStatement(label)]),
        );
        checkStatements = [labeled(label, block(innerStatements))];
    }

    return [
        emitTypeCheckedBlock(
            instanceOf(valueExpression, identifier('Date')),
            typeFailure,
            [timeDeclaration, ...checkStatements],
            sink,
        ),
    ];
}

export { emitDate };
