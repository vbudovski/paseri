import type { IR } from '@vbudovski/paseri/introspect';
import type ts from 'typescript';
import type { Sink, State } from '../state.ts';
import { emitIsoFieldTemporalSchema } from './_temporal-checks.ts';

type PlainDateTimeIR = Extract<IR, { kind: 'plainDateTime' }>;

const PLAIN_DATE_TIME_FIELDS = [
    'year',
    'month',
    'day',
    'hour',
    'minute',
    'second',
    'millisecond',
    'microsecond',
    'nanosecond',
] as const;

function emitPlainDateTime(
    ir: PlainDateTimeIR,
    valueExpression: ts.Expression,
    sink: Sink,
    state: State,
): ts.Statement[] {
    return emitIsoFieldTemporalSchema(
        'PlainDateTime',
        PLAIN_DATE_TIME_FIELDS,
        true,
        ir.checks,
        valueExpression,
        sink,
        state,
    );
}

export { emitPlainDateTime };
