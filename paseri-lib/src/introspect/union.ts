import type { Schema } from '../schemas/schema.ts';
import { UnionSchema } from '../schemas/union.ts';
import type { IR, IRContext } from './ir.ts';

interface Internals {
    _elements: readonly Schema<unknown>[];
}

UnionSchema.prototype._emit = function (context: IRContext): IR {
    const internals = this as unknown as Internals;
    const members = internals._elements.map((schema) => schema._emit(context));
    return { kind: 'union', members };
};
