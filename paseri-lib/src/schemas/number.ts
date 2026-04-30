import { TAG_FINITE, TAG_GT, TAG_GTE, TAG_INT, TAG_LT, TAG_LTE, TAG_SAFE_INT } from '../checks/tags.ts';
import { issueCodes, type LeafNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import type { Check } from './schema.ts';
import { Schema } from './schema.ts';

class NumberSchema extends Schema<number> {
    private readonly _checks: readonly Check[] | undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'number' },
    } as const satisfies Record<string, LeafNode>;

    constructor(checks?: readonly Check[]) {
        super();

        this._checks = checks;
    }
    protected _clone(): NumberSchema {
        return new NumberSchema(this._checks);
    }
    _parse(value: unknown): InternalParseResult<number> {
        if (typeof value !== 'number' || Number.isNaN(value)) {
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
                    case TAG_INT:
                        if (!Number.isInteger(value)) {
                            return check.issue;
                        }
                        break;
                    case TAG_FINITE:
                        if (!Number.isFinite(value)) {
                            return check.issue;
                        }
                        break;
                    case TAG_SAFE_INT:
                        if (!Number.isSafeInteger(value)) {
                            return check.issue;
                        }
                        break;
                }
            }
        }

        return undefined;
    }
}

const singleton = /* @__PURE__ */ new NumberSchema();

/**
 * [Number](https://paseri.dev/reference/schema/primitives/number/) schema.
 */
const number = /* @__PURE__ */ (...checks: Check[]): NumberSchema =>
    checks.length === 0 ? singleton : new NumberSchema(checks);

export { number };
