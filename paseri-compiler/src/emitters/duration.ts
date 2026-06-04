import type ts from 'typescript';
import { identifier, instanceOf, property, stringLiteral } from '../builders.ts';
import { emitLeafCheck, leafExpression } from '../issues.ts';
import type { Sink } from '../state.ts';

function emitDuration(valueExpression: ts.Expression, sink: Sink): ts.Statement[] {
    return [
        emitLeafCheck(
            instanceOf(valueExpression, property(identifier('Temporal'), 'Duration')),
            leafExpression('invalid_type', { expected: stringLiteral('Temporal.Duration') }),
            sink,
        ),
    ];
}

export { emitDuration };
