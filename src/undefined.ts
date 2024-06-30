import { type InternalParseResult, Schema } from './schema.ts';

class UndefinedSchema extends Schema<undefined> {
    readonly issues = {
        INVALID_VALUE: { type: 'leaf', code: 'invalid_value' },
    } as const;

    _parse(value: unknown): InternalParseResult<undefined> {
        if (value !== undefined) {
            return this.issues.INVALID_VALUE;
        }

        return undefined;
    }
}

// `undefined` is a reserved word.
function undefined_() {
    return new UndefinedSchema();
}

export { undefined_ };
