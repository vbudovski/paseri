import { PlainTimeSchema } from '../schemas/plainTime.ts';
import { convertChecks, type WithChecks } from './_shared.ts';
import { toCheck } from './_temporal.ts';
import type { IR, IRContext } from './ir.ts';

PlainTimeSchema.prototype._emit = function (_context: IRContext): IR {
    const internals = this as unknown as WithChecks<Temporal.PlainTime>;
    return { kind: 'plainTime', checks: convertChecks(internals._checks, toCheck) };
};
