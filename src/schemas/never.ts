import { type InternalParseResult, Schema } from './schema.ts';

class NeverSchema extends Schema<never> {
    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
    } as const;

    _parse(value: unknown): InternalParseResult<never> {
        return this.issues.INVALID_TYPE;
    }
}

const singleton = new NeverSchema();

function never() {
    return singleton;
}

export { never };
