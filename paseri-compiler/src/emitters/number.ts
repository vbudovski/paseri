import type { IR } from '@paseri/paseri/introspect';
import ts from 'typescript';
import {
    binary,
    block,
    breakStatement,
    call,
    equals,
    identifier,
    ifStatement,
    labeled,
    literalExpression,
    not,
    property,
    stringLiteral,
    typeofExpression,
} from '../builders.ts';
import { emitFailureRouting, emitTypeCheckedBlock, leafExpression } from '../issues.ts';
import { freshIdentifier, type Sink, type State } from '../state.ts';

type NumberIR = Extract<IR, { kind: 'number' }>;
type NumberCheck = NumberIR['checks'][number];

function checkExpression(check: NumberCheck, valueExpression: ts.Expression): [ts.Expression, ts.Expression] {
    switch (check.name) {
        case 'gte':
            return [
                binary(valueExpression, ts.SyntaxKind.GreaterThanEqualsToken, literalExpression(check.value)),
                leafExpression('too_small'),
            ];
        case 'gt':
            return [
                binary(valueExpression, ts.SyntaxKind.GreaterThanToken, literalExpression(check.value)),
                leafExpression('too_small'),
            ];
        case 'lte':
            return [
                binary(valueExpression, ts.SyntaxKind.LessThanEqualsToken, literalExpression(check.value)),
                leafExpression('too_large'),
            ];
        case 'lt':
            return [
                binary(valueExpression, ts.SyntaxKind.LessThanToken, literalExpression(check.value)),
                leafExpression('too_large'),
            ];
        case 'int':
            return [
                call(property(identifier('Number'), 'isInteger'), [valueExpression]),
                leafExpression('invalid_integer'),
            ];
        case 'finite':
            return [
                call(property(identifier('Number'), 'isFinite'), [valueExpression]),
                leafExpression('invalid_finite'),
            ];
        case 'safe':
            return [
                call(property(identifier('Number'), 'isSafeInteger'), [valueExpression]),
                leafExpression('invalid_safe_integer'),
            ];
    }
}

function checkBody(ir: NumberIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    if (ir.checks.length === 0) {
        return [];
    }
    if (sink.kind === 'return') {
        return ir.checks.flatMap((check) => {
            const [condition, issue] = checkExpression(check, valueExpression);
            return [ifStatement(not(condition), [emitFailureRouting(issue, sink)])];
        });
    }
    // Accumulate sink: the first failing check short-circuits the rest
    // (matches Paseri's runtime behaviour within a primitive).
    const label = freshIdentifier(state, 'labelCheck');
    const innerStatements: ts.Statement[] = [];
    for (const check of ir.checks) {
        const [condition, issue] = checkExpression(check, valueExpression);
        innerStatements.push(ifStatement(not(condition), [emitFailureRouting(issue, sink), breakStatement(label)]));
    }
    return [labeled(label, block(innerStatements))];
}

function emitNumber(ir: NumberIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const typeCondition = binary(
        equals(typeofExpression(valueExpression), stringLiteral('number')),
        ts.SyntaxKind.AmpersandAmpersandToken,
        not(call(property(identifier('Number'), 'isNaN'), [valueExpression])),
    );
    return [
        emitTypeCheckedBlock(
            typeCondition,
            leafExpression('invalid_type', { expected: stringLiteral('number') }),
            checkBody(ir, valueExpression, sink, state),
            sink,
        ),
    ];
}

export { emitNumber };
