import { type InternalParseResult, Schema } from './schema.ts';

class BooleanSchema extends Schema<boolean> {
    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
    } as const;

    _parse(value: unknown): InternalParseResult<boolean> {
        if (typeof value !== 'boolean') {
            return this.issues.INVALID_TYPE;
        }

        return undefined;
    }
}

function boolean() {
    return new BooleanSchema();
}

export { boolean };
