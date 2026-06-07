import type { IR } from '@paseri/paseri/introspect';
import type ts from 'typescript';
import type { Sink, State } from '../state.ts';
import { emitIsoFieldTemporalSchema } from './_temporal-checks.ts';

type PlainYearMonthIR = Extract<IR, { kind: 'plainYearMonth' }>;

// PlainYearMonth exposes no day getter, so the fast path compares year/month only. That equals
// `Temporal.PlainYearMonth.compare` exactly only when both value and bound are `iso8601` (reference day 1 on each) —
// `emitIsoFieldTemporalSchema`'s iso8601 value guard plus its iso8601-bound requirement together ensure that.
const PLAIN_YEAR_MONTH_FIELDS = ['year', 'month'] as const;

function emitPlainYearMonth(
    ir: PlainYearMonthIR,
    valueExpression: ts.Expression,
    sink: Sink,
    state: State,
): ts.Statement[] {
    return emitIsoFieldTemporalSchema(
        'PlainYearMonth',
        PLAIN_YEAR_MONTH_FIELDS,
        true,
        ir.checks,
        valueExpression,
        sink,
        state,
    );
}

export { emitPlainYearMonth };
