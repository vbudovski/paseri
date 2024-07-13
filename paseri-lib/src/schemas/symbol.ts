import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class SymbolSchema extends Schema<symbol> {
    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
    } as const;

    _parse(value: unknown): InternalParseResult<symbol> {
        if (typeof value !== 'symbol') {
            return this.issues.INVALID_TYPE;
        }

        return undefined;
    }
}

function symbol() {
    return new SymbolSchema();
}

export { symbol };
