import { EnumSchema } from '../schemas/enum.ts';
import type { IR, IRContext } from './ir.ts';

interface Internals {
    _values: readonly (string | number | bigint | boolean)[];
}

EnumSchema.prototype._emit = function (_context: IRContext): IR {
    const internals = this as unknown as Internals;
    return { kind: 'enum', values: internals._values };
};
