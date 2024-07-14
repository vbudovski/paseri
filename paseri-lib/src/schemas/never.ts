import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class NeverSchema extends Schema<never> {
    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
    } as const;

    protected _clone() {
        return new NeverSchema();
    }
    _parse(value: unknown): InternalParseResult<never> {
        return this.issues.INVALID_TYPE;
    }
}

const singleton = new NeverSchema();

function never() {
    return singleton;
}

export { never };
