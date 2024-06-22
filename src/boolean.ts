import { type ParseResult, Schema } from './schema.ts';

class BooleanSchema extends Schema<boolean> {
    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
    } as const;

    _parse(value: unknown): ParseResult<boolean> {
        if (typeof value !== 'boolean') {
            return { ok: false, issue: this.issues.INVALID_TYPE };
        }

        return { ok: true, value: value as boolean };
    }
}

function boolean() {
    return new BooleanSchema();
}

export { boolean };
