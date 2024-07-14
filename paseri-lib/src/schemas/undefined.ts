import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class UndefinedSchema extends Schema<undefined> {
    readonly issues = {
        INVALID_VALUE: { type: 'leaf', code: 'invalid_value' },
    } as const;

    protected _clone() {
        return new UndefinedSchema();
    }
    _parse(value: unknown): InternalParseResult<undefined> {
        if (value !== undefined) {
            return this.issues.INVALID_VALUE;
        }

        return undefined;
    }
}

const singleton = new UndefinedSchema();

// `undefined` is a reserved word.
function undefined_() {
    return singleton;
}

export { undefined_ };
