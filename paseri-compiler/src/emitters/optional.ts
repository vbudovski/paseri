import type { IR } from '@vbudovski/paseri/introspect';
import type ts from 'typescript';
import { ifStatement, notEquals, undefinedExpression } from '../builders.ts';
import { emitSuccessRouting } from '../issues.ts';
import type { Sink, State } from '../state.ts';
import { emitValidation } from '../toSource.ts';

type OptionalIR = Extract<IR, { kind: 'optional' }>;

function emitOptional(ir: OptionalIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const successStmt = emitSuccessRouting(sink);
    return [
        ifStatement(
            notEquals(valueExpression, undefinedExpression),
            emitValidation(ir.inner, valueExpression, sink, state),
            successStmt !== undefined ? [successStmt] : [],
        ),
    ];
}

export { emitOptional };
