import type { IR } from '@paseri/paseri/introspect';
import ts from 'typescript';
import {
    binary,
    call,
    constStatement,
    identifier,
    ifStatement,
    instanceOf,
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
    const invalidDateCheck = ifStatement(call(property(identifier('Number'), 'isNaN'), [timeIdentifier]), [
        emitFailureRouting(dateFailure, sink),
    ]);
    const checks = ir.checks.flatMap((check) => {
        const bound = literalExpression(check.value.getTime());
        const condition =
            check.name === 'min'
                ? binary(timeIdentifier, ts.SyntaxKind.GreaterThanEqualsToken, bound)
                : binary(timeIdentifier, ts.SyntaxKind.LessThanEqualsToken, bound);
        const code = check.name === 'min' ? 'too_dated' : 'too_recent';
        return [ifStatement(not(condition), [emitFailureRouting(leafExpression(code), sink)])];
    });
    return [
        emitTypeCheckedBlock(
            instanceOf(valueExpression, identifier('Date')),
            typeFailure,
            [timeDeclaration, invalidDateCheck, ...checks],
            sink,
        ),
    ];
}

export { emitDate };
