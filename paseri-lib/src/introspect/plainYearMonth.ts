import { PlainYearMonthSchema } from '../schemas/plainYearMonth.ts';
import { convertChecks, type WithChecks } from './_shared.ts';
import { toCheck } from './_temporal.ts';
import type { IR, IRContext } from './ir.ts';

PlainYearMonthSchema.prototype._emit = function (_context: IRContext): IR {
    const internals = this as unknown as WithChecks<Temporal.PlainYearMonth>;
    return { kind: 'plainYearMonth', checks: convertChecks(internals._checks, toCheck) };
};
