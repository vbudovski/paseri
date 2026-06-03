import { RefineSchema, type Schema } from '../schemas/schema.ts';
import { serializeCallback } from './_callback.ts';
import type { IR, IRContext } from './ir.ts';

interface Internals {
    _base: Schema<unknown>;
    _predicate: (value: unknown) => boolean;
    _code: string;
    _path: readonly (string | number)[];
    _params: Record<string, unknown> | undefined;
    _callSiteFile: string | undefined;
}

RefineSchema.prototype._emit = function (context: IRContext): IR {
    const internals = this as unknown as Internals;
    const inner = internals._base._emit(context);
    try {
        const callback = serializeCallback(internals._predicate, internals._callSiteFile);
        return {
            kind: 'refine',
            inner,
            callback,
            code: internals._code,
            path: internals._path,
            ...(internals._params !== undefined && { params: internals._params }),
        };
    } catch (error) {
        return {
            kind: 'unsupported',
            schema: 'refine',
            reason: error instanceof Error ? error.message : String(error),
        };
    }
};
