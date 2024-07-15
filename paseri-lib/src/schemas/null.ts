import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class NullSchema extends Schema<null> {
    readonly issues = {
        INVALID_VALUE: { type: 'leaf', code: 'invalid_value' },
    } as const;

    protected _clone(): NullSchema {
        return new NullSchema();
    }
    _parse(value: unknown): InternalParseResult<null> {
        if (value !== null) {
            return this.issues.INVALID_VALUE;
        }

        return undefined;
    }
}

const singleton = new NullSchema();

// `null` is a reserved word.
function null_(): NullSchema {
    return singleton;
}

export { null_ };
