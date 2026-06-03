import { PlainDateSchema } from '../schemas/plainDate.ts';
import { convertChecks, type WithChecks } from './_shared.ts';
import { toCheck } from './_temporal.ts';
import type { IR, IRContext } from './ir.ts';

PlainDateSchema.prototype._emit = function (_context: IRContext): IR {
    const internals = this as unknown as WithChecks<Temporal.PlainDate>;
    return { kind: 'plainDate', checks: convertChecks(internals._checks, toCheck) };
};
