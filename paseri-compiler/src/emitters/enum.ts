import type { IR } from '@paseri/paseri/introspect';
import ts from 'typescript';
import { call, ifStatement, not, primitiveToString, property, stringLiteral } from '../builders.ts';
import { emitFailureRouting, leafExpression } from '../issues.ts';
import { hoistEnum, type Sink, type State } from '../state.ts';

const { factory } = ts;

type EnumIR = Extract<IR, { kind: 'enum' }>;

function emitEnum(ir: EnumIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const setIdentifier = hoistEnum(state, ir.values);
    const expectedArray = factory.createArrayLiteralExpression(
        ir.values.map((value) => stringLiteral(primitiveToString(value))),
        false,
    );
    return [
        ifStatement(not(call(property(setIdentifier, 'has'), [valueExpression])), [
            emitFailureRouting(leafExpression('invalid_enum_value', { expected: expectedArray }), sink),
        ]),
    ];
}

export { emitEnum };
