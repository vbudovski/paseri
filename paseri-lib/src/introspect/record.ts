import { RecordSchema } from '../schemas/record.ts';
import type { Schema } from '../schemas/schema.ts';
import type { IR, IRContext } from './ir.ts';

interface Internals {
    _element: Schema<unknown>;
}

RecordSchema.prototype._emit = function (context: IRContext): IR {
    const internals = this as unknown as Internals;
    const element = internals._element._emit(context);
    return { kind: 'record', element };
};
