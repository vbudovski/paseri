import type ts from 'typescript';
import { equals, stringLiteral, typeofExpression } from '../builders.ts';
import { emitLeafCheck, leafExpression } from '../issues.ts';
import type { Sink } from '../state.ts';

function emitSymbol(valueExpression: ts.Expression, sink: Sink): ts.Statement[] {
    return [
        emitLeafCheck(
            equals(typeofExpression(valueExpression), stringLiteral('symbol')),
            leafExpression('invalid_type', { expected: stringLiteral('Symbol') }),
            sink,
        ),
    ];
}

export { emitSymbol };
