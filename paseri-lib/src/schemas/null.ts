import { type LeafNode, issueCodes } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class NullSchema extends Schema<null> {
    private readonly issues = {
        INVALID_VALUE: { type: 'leaf', code: issueCodes.INVALID_VALUE, expected: 'null' },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): NullSchema {
        return new NullSchema();
    }
    _parse(value: unknown): InternalParseResult<null> {
        if (value !== null) {
            return this.issues.INVALID_VALUE;
        }

        return undefined;
    }
}

const singleton = /* @__PURE__ */ new NullSchema();

/**
 * [Null](https://paseri.dev/reference/schema/primitives/null/) schema.
 */
// `null` is a reserved word.
const null_ = /* @__PURE__ */ (): NullSchema => singleton;

export { null_ };
