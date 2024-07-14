import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class UnknownSchema extends Schema<unknown> {
    protected _clone() {
        return new UnknownSchema();
    }
    _parse(value: unknown): InternalParseResult<unknown> {
        return undefined;
    }
}

const singleton = new UnknownSchema();

function unknown() {
    return singleton;
}

export { unknown };
