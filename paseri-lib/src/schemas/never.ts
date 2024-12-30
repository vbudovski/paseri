import { type LeafNode, issueCodes } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class NeverSchema extends Schema<never> {
    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'never' },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): NeverSchema {
        return new NeverSchema();
    }
    _parse(value: unknown): InternalParseResult<never> {
        return this.issues.INVALID_TYPE;
    }
}

const singleton = /* @__PURE__ */ new NeverSchema();

const never = /* @__PURE__ */ (): NeverSchema => singleton;

export { never };
