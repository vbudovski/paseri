import { LiteralSchema } from '../schemas/literal.ts';
import type { IR, IRContext } from './ir.ts';

interface Internals {
    _value: string | number | bigint | boolean;
}

LiteralSchema.prototype._emit = function (_context: IRContext): IR {
    const internals = this as unknown as Internals;
    return { kind: 'literal', value: internals._value };
};
