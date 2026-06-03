import type { ParseResult } from '../result.ts';
import { ChainSchema, type Schema } from '../schemas/schema.ts';
import { serializeCallback } from './_callback.ts';
import type { IR, IRContext } from './ir.ts';

interface Internals {
    _fromSchema: Schema<unknown>;
    _toSchema: Schema<unknown>;
    _transformer: (value: unknown) => ParseResult<unknown>;
    _callSiteFile: string | undefined;
}

ChainSchema.prototype._emit = function (context: IRContext): IR {
    const internals = this as unknown as Internals;
    const from = internals._fromSchema._emit(context);
    const to = internals._toSchema._emit(context);
    try {
        const callback = serializeCallback(internals._transformer, internals._callSiteFile);
        return { kind: 'chain', from, to, callback };
    } catch (error) {
        return {
            kind: 'unsupported',
            schema: 'chain',
            reason: error instanceof Error ? error.message : String(error),
        };
    }
};
