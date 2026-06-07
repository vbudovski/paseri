import type { IR } from '@paseri/paseri/introspect';
import type ts from 'typescript';
import type { Sink, State } from '../state.ts';
import { emitIsoFieldTemporalSchema } from './_temporal-checks.ts';

type PlainTimeIR = Extract<IR, { kind: 'plainTime' }>;

// PlainTime carries no calendar, so the field compare is unconditionally equivalent to `Temporal.PlainTime.compare`
// (hence `guarded: false` — no `iso8601` runtime guard needed).
const PLAIN_TIME_FIELDS = ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'] as const;

function emitPlainTime(ir: PlainTimeIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    return emitIsoFieldTemporalSchema('PlainTime', PLAIN_TIME_FIELDS, false, ir.checks, valueExpression, sink, state);
}

export { emitPlainTime };
