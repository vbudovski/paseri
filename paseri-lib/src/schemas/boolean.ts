import { type LeafNode, issueCodes } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class BooleanSchema extends Schema<boolean> {
    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'boolean' },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): BooleanSchema {
        return new BooleanSchema();
    }
    _parse(value: unknown): InternalParseResult<boolean> {
        if (typeof value !== 'boolean') {
            return this.issues.INVALID_TYPE;
        }

        return undefined;
    }
}

const singleton = /* @__PURE__ */ new BooleanSchema();

/**
 * [Boolean](https://paseri.dev/reference/schema/primitives/boolean/) schema.
 */
const boolean = /* @__PURE__ */ (): BooleanSchema => singleton;

export { boolean };
