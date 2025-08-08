import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class UnknownSchema extends Schema<unknown> {
    protected _clone(): UnknownSchema {
        return new UnknownSchema();
    }
    _parse(_value: unknown): InternalParseResult<unknown> {
        return undefined;
    }
}

const singleton = /* @__PURE__ */ new UnknownSchema();

/**
 * [Unknown](https://paseri.dev/reference/schema/others/unknown/) schema.
 */
const unknown = /* @__PURE__ */ (): UnknownSchema => singleton;

export { unknown };
