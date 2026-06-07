import type { IR } from '@paseri/paseri/introspect';
import type ts from 'typescript';
import { ifStatement, notEquals, nullExpression } from '../builders.ts';
import { emitSuccessRouting } from '../issues.ts';
import type { Sink, State } from '../state.ts';
import { emitValidation } from '../toSource.ts';

type NullableIR = Extract<IR, { kind: 'nullable' }>;

function emitNullable(ir: NullableIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const successStmt = emitSuccessRouting(sink);
    return [
        ifStatement(
            notEquals(valueExpression, nullExpression),
            emitValidation(ir.inner, valueExpression, sink, state),
            successStmt !== undefined ? [successStmt] : [],
        ),
    ];
}

export { emitNullable };
