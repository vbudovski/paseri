import { issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

const TAG_GTE = 0;
const TAG_GT = 1;
const TAG_LTE = 2;
const TAG_LT = 3;

interface BigIntCheck {
    tag: typeof TAG_GTE | typeof TAG_GT | typeof TAG_LTE | typeof TAG_LT;
    param: bigint;
    issue: TreeNode;
}

class BigIntSchema extends Schema<bigint> {
    private _checks: BigIntCheck[] | undefined = undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'bigint' },
        TOO_SMALL: { type: 'leaf', code: issueCodes.TOO_SMALL },
        TOO_LARGE: { type: 'leaf', code: issueCodes.TOO_LARGE },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): BigIntSchema {
        const cloned = new BigIntSchema();
        cloned._checks = this._checks?.slice();

        return cloned;
    }
    _parse(value: unknown): InternalParseResult<bigint> {
        if (typeof value !== 'bigint') {
            return this.issues.INVALID_TYPE;
        }

        if (this._checks !== undefined) {
            const checks = this._checks;
            for (let i = 0; i < checks.length; i++) {
                const { tag, param, issue } = checks[i];
                switch (tag) {
                    case TAG_GTE:
                        if (value < param) {
                            return issue;
                        }
                        break;
                    case TAG_GT:
                        if (value <= param) {
                            return issue;
                        }
                        break;
                    case TAG_LTE:
                        if (value > param) {
                            return issue;
                        }
                        break;
                    case TAG_LT:
                        if (value >= param) {
                            return issue;
                        }
                        break;
                }
            }
        }

        return undefined;
    }
    gte(value: bigint): BigIntSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push({ tag: TAG_GTE, param: value, issue: this.issues.TOO_SMALL });

        return cloned;
    }
    gt(value: bigint): BigIntSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push({ tag: TAG_GT, param: value, issue: this.issues.TOO_SMALL });

        return cloned;
    }
    lte(value: bigint): BigIntSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push({ tag: TAG_LTE, param: value, issue: this.issues.TOO_LARGE });

        return cloned;
    }
    lt(value: bigint): BigIntSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push({ tag: TAG_LT, param: value, issue: this.issues.TOO_LARGE });

        return cloned;
    }
}

const singleton = /* @__PURE__ */ new BigIntSchema();

/**
 * [BigInt](https://paseri.dev/reference/schema/primitives/bigint/) schema.
 */
const bigint = /* @__PURE__ */ (): BigIntSchema => singleton;

export { bigint };
