import type { IR } from '@vbudovski/paseri/introspect';
import type ts from 'typescript';
import type { Sink, State } from '../state.ts';
import { emitEpochTemporalSchema } from './_temporal-checks.ts';

type ZonedDateTimeIR = Extract<IR, { kind: 'zonedDateTime' }>;

function emitZonedDateTime(
    ir: ZonedDateTimeIR,
    valueExpression: ts.Expression,
    sink: Sink,
    state: State,
): ts.Statement[] {
    return emitEpochTemporalSchema('ZonedDateTime', ir.checks, valueExpression, sink, state);
}

export { emitZonedDateTime };
