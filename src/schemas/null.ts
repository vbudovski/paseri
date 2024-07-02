import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class NullSchema extends Schema<null> {
    readonly issues = {
        INVALID_VALUE: { type: 'leaf', code: 'invalid_value' },
    } as const;

    _parse(value: unknown): InternalParseResult<null> {
        if (value !== null) {
            return this.issues.INVALID_VALUE;
        }

        return undefined;
    }
}

// `null` is a reserved word.
function null_() {
    return new NullSchema();
}

export { null_ };
