import { PlainDateTimeSchema } from '../schemas/plainDateTime.ts';
import { convertChecks, type WithChecks } from './_shared.ts';
import { toCheck } from './_temporal.ts';
import type { IR, IRContext } from './ir.ts';

PlainDateTimeSchema.prototype._emit = function (_context: IRContext): IR {
    const internals = this as unknown as WithChecks<Temporal.PlainDateTime>;
    return { kind: 'plainDateTime', checks: convertChecks(internals._checks, toCheck) };
};
