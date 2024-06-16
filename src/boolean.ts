import { type ParseResult, Schema } from './schema.ts';

class BooleanSchema extends Schema<boolean> {
    _parse(value: unknown): ParseResult<boolean> {
        if (typeof value !== 'boolean') {
            return { ok: false, issue: { type: 'leaf', code: 'invalid_type' } };
        }

        return { ok: true, value: value as boolean };
    }
}

function boolean() {
    return new BooleanSchema();
}

export { boolean };
