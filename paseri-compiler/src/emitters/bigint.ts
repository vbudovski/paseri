import type { IR } from '@paseri/paseri/introspect';
import ts from 'typescript';
import {
    bigintLiteral,
    binary,
    block,
    breakStatement,
    equals,
    ifStatement,
    labeled,
    not,
    stringLiteral,
    typeofExpression,
} from '../builders.ts';
import { emitFailureRouting, emitTypeCheckedBlock, leafExpression } from '../issues.ts';
import { freshIdentifier, type Sink, type State } from '../state.ts';

type BigIntIR = Extract<IR, { kind: 'bigint' }>;
type BigIntCheck = BigIntIR['checks'][number];

function checkExpression(check: BigIntCheck, valueExpression: ts.Expression): [ts.Expression, ts.Expression] {
    const bound = bigintLiteral(check.value);
    switch (check.name) {
        case 'gte':
            return [binary(valueExpression, ts.SyntaxKind.GreaterThanEqualsToken, bound), leafExpression('too_small')];
        case 'gt':
            return [binary(valueExpression, ts.SyntaxKind.GreaterThanToken, bound), leafExpression('too_small')];
        case 'lte':
            return [binary(valueExpression, ts.SyntaxKind.LessThanEqualsToken, bound), leafExpression('too_large')];
        case 'lt':
            return [binary(valueExpression, ts.SyntaxKind.LessThanToken, bound), leafExpression('too_large')];
    }
}

function checkBody(ir: BigIntIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
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

function emitBigInt(ir: BigIntIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    return [
        emitTypeCheckedBlock(
            equals(typeofExpression(valueExpression), stringLiteral('bigint')),
            leafExpression('invalid_type', { expected: stringLiteral('bigint') }),
            checkBody(ir, valueExpression, sink, state),
            sink,
        ),
    ];
}

export { emitBigInt };
