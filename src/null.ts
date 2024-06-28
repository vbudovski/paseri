import { type ParseResult, Schema } from './schema.ts';

class NullSchema extends Schema<null> {
    readonly issues = {
        INVALID_VALUE: { type: 'leaf', code: 'invalid_value' },
    } as const;

    _parse(value: unknown): ParseResult<null> {
        if (value !== null) {
            return { ok: false, issue: this.issues.INVALID_VALUE };
        }

        return { ok: true, value };
    }
}

// `null` is a reserved word.
function null_() {
    return new NullSchema();
}

export { null_ };
