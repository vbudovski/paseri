import type { IR } from '@paseri/paseri/introspect';
import type ts from 'typescript';
import {
    call,
    equals,
    identifier,
    literalExpression,
    primitiveToString,
    property,
    stringLiteral,
} from '../builders.ts';
import { emitLeafCheck, leafExpression } from '../issues.ts';
import type { Sink } from '../state.ts';

type LiteralIR = Extract<IR, { kind: 'literal' }>;

function emitLiteral(ir: LiteralIR, valueExpression: ts.Expression, sink: Sink): ts.Statement[] {
    const condition =
        typeof ir.value === 'number' && Number.isNaN(ir.value)
            ? call(property(identifier('Number'), 'isNaN'), [valueExpression])
            : equals(valueExpression, literalExpression(ir.value));
    return [
        emitLeafCheck(
            condition,
            leafExpression('invalid_value', { expected: stringLiteral(primitiveToString(ir.value)) }),
            sink,
        ),
    ];
}

export { emitLiteral };
