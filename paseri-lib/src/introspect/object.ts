import { ObjectSchema } from '../schemas/object.ts';
import type { Schema } from '../schemas/schema.ts';
import type { IR, IRContext, ObjectMode } from './ir.ts';

interface Internals {
    _shape: Record<PropertyKey, Schema<unknown>>;
    _mode: ObjectMode;
}

ObjectSchema.prototype._emit = function (context: IRContext): IR {
    const internals = this as unknown as Internals;
    // Null prototype: a __proto__ shape key must land in the map, not hit the inherited setter.
    const fields: Record<string, IR> = Object.create(null);
    for (const key in internals._shape) {
        fields[key] = internals._shape[key]._emit(context);
    }
    return { kind: 'object', fields, mode: internals._mode };
};
