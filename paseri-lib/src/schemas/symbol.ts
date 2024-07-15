import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class SymbolSchema extends Schema<symbol> {
    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
    } as const;

    protected _clone(): SymbolSchema {
        return new SymbolSchema();
    }
    _parse(value: unknown): InternalParseResult<symbol> {
        if (typeof value !== 'symbol') {
            return this.issues.INVALID_TYPE;
        }

        return undefined;
    }
}

const singleton = new SymbolSchema();

function symbol(): SymbolSchema {
    return singleton;
}

export { symbol };
