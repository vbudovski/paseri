import { type ParseResult, Schema } from './schema.ts';

class UnknownSchema extends Schema<unknown> {
    _parse(value: unknown): ParseResult<unknown> {
        return { ok: true, value };
    }
}

const singleton = new UnknownSchema();

function unknown() {
    return singleton;
}

export { unknown };
