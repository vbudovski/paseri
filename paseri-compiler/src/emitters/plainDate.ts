import type { IR } from '@paseri/paseri/introspect';
import type ts from 'typescript';
import type { Sink, State } from '../state.ts';
import { emitIsoFieldTemporalSchema } from './_temporal-checks.ts';

type PlainDateIR = Extract<IR, { kind: 'plainDate' }>;

const PLAIN_DATE_FIELDS = ['year', 'month', 'day'] as const;

function emitPlainDate(ir: PlainDateIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    return emitIsoFieldTemporalSchema('PlainDate', PLAIN_DATE_FIELDS, true, ir.checks, valueExpression, sink, state);
}

export { emitPlainDate };
