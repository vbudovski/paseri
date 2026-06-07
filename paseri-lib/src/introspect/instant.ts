import { InstantSchema } from '../schemas/instant.ts';
import { convertChecks, type WithChecks } from './_shared.ts';
import { toCheck } from './_temporal.ts';
import type { IR, IRContext } from './ir.ts';

InstantSchema.prototype._emit = function (_context: IRContext): IR {
    const internals = this as unknown as WithChecks<Temporal.Instant>;
    return { kind: 'instant', checks: convertChecks(internals._checks, toCheck) };
};
