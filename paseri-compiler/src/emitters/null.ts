import type ts from 'typescript';
import { equals, nullExpression, stringLiteral } from '../builders.ts';
import { emitLeafCheck, leafExpression } from '../issues.ts';
import type { Sink } from '../state.ts';

function emitNull(valueExpression: ts.Expression, sink: Sink): ts.Statement[] {
    return [
        emitLeafCheck(
            equals(valueExpression, nullExpression),
            leafExpression('invalid_value', { expected: stringLiteral('null') }),
            sink,
        ),
    ];
}

export { emitNull };
