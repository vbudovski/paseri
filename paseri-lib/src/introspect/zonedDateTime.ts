import { ZonedDateTimeSchema } from '../schemas/zonedDateTime.ts';
import { convertChecks, type WithChecks } from './_shared.ts';
import { toCheck } from './_temporal.ts';
import type { IR, IRContext } from './ir.ts';

ZonedDateTimeSchema.prototype._emit = function (_context: IRContext): IR {
    const internals = this as unknown as WithChecks<Temporal.ZonedDateTime>;
    return { kind: 'zonedDateTime', checks: convertChecks(internals._checks, toCheck) };
};
