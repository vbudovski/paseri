import type { IR } from '@paseri/paseri/introspect';
import type ts from 'typescript';
import type { Sink, State } from '../state.ts';
import { emitEpochTemporalSchema } from './_temporal-checks.ts';

type InstantIR = Extract<IR, { kind: 'instant' }>;

function emitInstant(ir: InstantIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    return emitEpochTemporalSchema('Instant', ir.checks, valueExpression, sink, state);
}

export { emitInstant };
