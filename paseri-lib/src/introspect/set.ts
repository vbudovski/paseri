import type { Schema } from '../schemas/schema.ts';
import { SetSchema } from '../schemas/set.ts';
import { sizeChecks } from './_shared.ts';
import type { IR, IRContext } from './ir.ts';

interface Internals {
    _element: Schema<unknown>;
    _minSize: number;
    _maxSize: number;
}

SetSchema.prototype._emit = function (context: IRContext): IR {
    const internals = this as unknown as Internals;
    const element = internals._element._emit(context);
    return { kind: 'set', element, checks: sizeChecks(internals._minSize, internals._maxSize) };
};
