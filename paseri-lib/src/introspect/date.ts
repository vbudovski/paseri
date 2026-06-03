import { DateSchema } from '../schemas/date.ts';
import { convertChecks, type WithChecks } from './_shared.ts';
import { toCheck } from './_temporal.ts';
import type { IR, IRContext } from './ir.ts';

DateSchema.prototype._emit = function (_context: IRContext): IR {
    const internals = this as unknown as WithChecks<Date>;
    return { kind: 'date', checks: convertChecks(internals._checks, toCheck) };
};
