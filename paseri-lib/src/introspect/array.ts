import { ArraySchema } from '../schemas/array.ts';
import type { Schema } from '../schemas/schema.ts';
import { lengthChecks } from './_shared.ts';
import type { IR, IRContext } from './ir.ts';

interface Internals {
    _element: Schema<unknown>;
    _minLength: number;
    _maxLength: number;
}

ArraySchema.prototype._emit = function (context: IRContext): IR {
    const internals = this as unknown as Internals;
    const element = internals._element._emit(context);
    return { kind: 'array', element, checks: lengthChecks(internals._minLength, internals._maxLength) };
};
