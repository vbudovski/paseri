import type { Schema } from '../schemas/schema.ts';
import { TupleSchema } from '../schemas/tuple.ts';
import type { IR, IRContext } from './ir.ts';

interface Internals {
    _schemas: readonly Schema<unknown>[];
}

TupleSchema.prototype._emit = function (context: IRContext): IR {
    const internals = this as unknown as Internals;
    const elements = internals._schemas.map((schema) => schema._emit(context));
    return { kind: 'tuple', elements };
};
