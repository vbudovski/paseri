import { MapSchema } from '../schemas/map.ts';
import type { Schema } from '../schemas/schema.ts';
import { sizeChecks } from './_shared.ts';
import type { IR, IRContext } from './ir.ts';

interface Internals {
    _element: readonly [Schema<unknown>, Schema<unknown>];
    _minSize: number;
    _maxSize: number;
}

MapSchema.prototype._emit = function (context: IRContext): IR {
    const internals = this as unknown as Internals;
    const [keySchema, valueSchema] = internals._element;
    const key = keySchema._emit(context);
    const value = valueSchema._emit(context);
    return { kind: 'map', key, value, checks: sizeChecks(internals._minSize, internals._maxSize) };
};
