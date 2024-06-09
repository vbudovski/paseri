import { type ParseResult, Schema } from './schema.ts';

class BooleanSchema extends Schema<boolean> {
    override _parse(value: unknown): ParseResult<boolean> {
        if (typeof value !== 'boolean') {
            return { status: 'error', errors: [{ path: [], message: 'Not a boolean.' }] };
        }

        return super._parse(value);
    }
}

function boolean() {
    return new BooleanSchema();
}

export { boolean };
