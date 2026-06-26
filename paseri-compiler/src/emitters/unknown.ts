import type ts from 'typescript';
import { emitSuccessRouting } from '../issues.ts';
import type { Sink } from '../state.ts';

function emitUnknown(_valueExpression: ts.Expression, sink: Sink): ts.Statement[] {
    const success = emitSuccessRouting(sink);
    return success !== undefined ? [success] : [];
}

export { emitUnknown };
