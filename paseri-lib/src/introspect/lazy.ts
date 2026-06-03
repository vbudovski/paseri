import { LazySchema } from '../schemas/lazy.ts';
import type { Schema } from '../schemas/schema.ts';
import type { IR, IRContext } from './ir.ts';

interface Internals {
    _lazy: () => Schema<unknown>;
    _schema: Schema<unknown> | undefined;
}

LazySchema.prototype._emit = function (context: IRContext): IR {
    const internals = this as unknown as Internals;
    if (internals._schema === undefined) {
        internals._schema = internals._lazy();
    }
    const resolved = internals._schema;
    const existing = context.visited.get(resolved);
    if (existing !== undefined) {
        return { kind: 'ref', name: existing };
    }
    const name = `_lazy_${context.nextId}`;
    context.nextId += 1;
    context.visited.set(resolved, name);
    context.named[name] = resolved._emit(context);
    return { kind: 'ref', name };
};
