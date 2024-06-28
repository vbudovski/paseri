import { type ParseResult, Schema } from './schema.ts';

class UndefinedSchema extends Schema<undefined> {
    readonly issues = {
        INVALID_VALUE: { type: 'leaf', code: 'invalid_value' },
    } as const;

    _parse(value: unknown): ParseResult<undefined> {
        if (value !== undefined) {
            return { ok: false, issue: this.issues.INVALID_VALUE };
        }

        return { ok: true, value };
    }
}

// `undefined` is a reserved word.
function undefined_() {
    return new UndefinedSchema();
}

export { undefined_ };
