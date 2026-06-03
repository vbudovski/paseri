import { DefaultSchema, type Schema } from '../schemas/schema.ts';
import type { IR, IRContext } from './ir.ts';

interface Internals {
    _schema: Schema<unknown>;
    _default: unknown;
}

DefaultSchema.prototype._emit = function (context: IRContext): IR {
    const internals = this as unknown as Internals;
    const inner = internals._schema._emit(context);
    return { kind: 'default', inner, value: internals._default };
};
