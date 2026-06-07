import type ts from 'typescript';
import { falseLiteral, stringLiteral } from '../builders.ts';
import { emitLeafCheck, leafExpression } from '../issues.ts';
import type { Sink } from '../state.ts';

function emitNever(_valueExpr: ts.Expression, sink: Sink): ts.Statement[] {
    return [emitLeafCheck(falseLiteral, leafExpression('invalid_type', { expected: stringLiteral('never') }), sink)];
}

export { emitNever };
