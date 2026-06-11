import type { Schema } from '../schemas/schema.ts';
import { UnionSchema } from '../schemas/union.ts';
import type { IR, IRContext } from './ir.ts';

interface Internals {
    _elements: readonly Schema<unknown>[];
    _discriminator: { found: false } | { found: true; key: string };
}

UnionSchema.prototype._emit = function (context: IRContext): IR {
    const internals = this as unknown as Internals;
    const members = internals._elements.map((schema) => schema._emit(context));
    if (internals._discriminator.found) {
        return { kind: 'union', members, discriminator: internals._discriminator.key };
    }
    return { kind: 'union', members };
};
