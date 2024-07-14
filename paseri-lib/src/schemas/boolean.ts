import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class BooleanSchema extends Schema<boolean> {
    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
    } as const;

    protected _clone() {
        return new BooleanSchema();
    }
    _parse(value: unknown): InternalParseResult<boolean> {
        if (typeof value !== 'boolean') {
            return this.issues.INVALID_TYPE;
        }

        return undefined;
    }
}

const singleton = new BooleanSchema();

function boolean() {
    return singleton;
}

export { boolean };
