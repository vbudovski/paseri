import { type ParseResult, Schema, type ValidationError } from './schema.ts';

class BooleanSchema extends Schema<boolean> {
    private readonly issues: Record<string, [ValidationError]> = {
        INVALID_TYPE: [{ path: [], message: 'Not a boolean.' }],
    };

    _parse(value: unknown): ParseResult<boolean> {
        if (typeof value !== 'boolean') {
            return { ok: false, errors: this.issues.INVALID_TYPE };
        }

        return { ok: true, value: value as boolean };
    }
}

function boolean() {
    return new BooleanSchema();
}

export { boolean };
