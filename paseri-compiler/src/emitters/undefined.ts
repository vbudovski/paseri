import type ts from 'typescript';
import { equals, stringLiteral, undefinedExpression } from '../builders.ts';
import { emitLeafCheck, leafExpression } from '../issues.ts';
import type { Sink } from '../state.ts';

function emitUndefined(valueExpression: ts.Expression, sink: Sink): ts.Statement[] {
    return [
        emitLeafCheck(
            equals(valueExpression, undefinedExpression),
            leafExpression('invalid_value', { expected: stringLiteral('undefined') }),
            sink,
        ),
    ];
}

export { emitUndefined };
