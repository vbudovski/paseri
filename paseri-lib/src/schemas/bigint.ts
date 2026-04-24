import { TAG_GT, TAG_GTE, TAG_LT, TAG_LTE } from '../checks/tags.ts';
import { issueCodes, type LeafNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import type { Check } from './schema.ts';
import { Schema } from './schema.ts';

class BigIntSchema extends Schema<bigint> {
    private readonly _checks: readonly Check[] | undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'bigint' },
    } as const satisfies Record<string, LeafNode>;

    constructor(checks?: readonly Check[]) {
        super();

        this._checks = checks;
    }
    protected _clone(): BigIntSchema {
        return new BigIntSchema(this._checks);
    }
    _parse(value: unknown): InternalParseResult<bigint> {
        if (typeof value !== 'bigint') {
            return this.issues.INVALID_TYPE;
        }

        if (this._checks !== undefined) {
            const checks = this._checks;
            for (let i = 0; i < checks.length; i++) {
                const check = checks[i];
                switch (check.tag) {
                    case TAG_GTE:
                        if (value < check.param) {
                            return check.issue;
                        }
                        break;
                    case TAG_GT:
                        if (value <= check.param) {
                            return check.issue;
                        }
                        break;
                    case TAG_LTE:
                        if (value > check.param) {
                            return check.issue;
                        }
                        break;
                    case TAG_LT:
                        if (value >= check.param) {
                            return check.issue;
                        }
                        break;
                }
            }
        }

        return undefined;
    }
}

const singleton = /* @__PURE__  */ new BigIntSchema();

/**
 * [BigInt](https://paseri.dev/reference/schema/primitives/bigint/) schema.
 */
const bigint = /* @__PURE__ */ (...checks: Check[]): BigIntSchema =>
    checks.length === 0 ? singleton : new BigIntSchema(checks);

export { bigint };
