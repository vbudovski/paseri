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
    _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<bigint> {
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
        this._assertLowerWithinUpper(value, false);

        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_GTE, param: value, issue: this.issues.TOO_SMALL });

        return cloned;
    }
    gt(value: bigint): BigIntSchema {
        this._assertLowerWithinUpper(value, true);

        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_GT, param: value, issue: this.issues.TOO_SMALL });

        return cloned;
    }
    lte(value: bigint): BigIntSchema {
        this._assertUpperWithinLower(value, false);

        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_LTE, param: value, issue: this.issues.TOO_LARGE });

        return cloned;
    }
    lt(value: bigint): BigIntSchema {
        this._assertUpperWithinLower(value, true);

        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_LT, param: value, issue: this.issues.TOO_LARGE });

        return cloned;
    }
    // Contradictory bounds reject every input, so a lower bound that can't be satisfied alongside the existing upper
    // bound (or vice versa) is a construction error. `gt(5n).lt(5n)` and `gte(5n).lt(5n)` throw; `gte(5n).lte(5n)`
    // (the single value 5n) is fine.
    private _assertLowerWithinUpper(value: bigint, strict: boolean): void {
        const upper = this._effectiveUpperBound();
        if (upper !== undefined && (value > upper.value || (value === upper.value && (strict || upper.strict)))) {
            throw new Error('Lower bound must not exceed upper bound.');
        }
    }
    private _assertUpperWithinLower(value: bigint, strict: boolean): void {
        const lower = this._effectiveLowerBound();
        if (lower !== undefined && (value < lower.value || (value === lower.value && (strict || lower.strict)))) {
            throw new Error('Lower bound must not exceed upper bound.');
        }
    }
    // Binding lower bound across repeated gte/gt: the largest, marked strict when a `gt` sits at that value.
    private _effectiveLowerBound(): { value: bigint; strict: boolean } | undefined {
        if (this._checks === undefined) {
            return undefined;
        }
        let value: bigint | undefined;
        for (const check of this._checks) {
            if ((check.tag === TAG_GTE || check.tag === TAG_GT) && (value === undefined || check.param > value)) {
                value = check.param;
            }
        }
        if (value === undefined) {
            return undefined;
        }
        let strict = false;
        for (const check of this._checks) {
            if (check.tag === TAG_GT && check.param === value) {
                strict = true;
            }
        }

        return { value, strict };
    }
    private _effectiveUpperBound(): { value: bigint; strict: boolean } | undefined {
        if (this._checks === undefined) {
            return undefined;
        }
        let value: bigint | undefined;
        for (const check of this._checks) {
            if ((check.tag === TAG_LTE || check.tag === TAG_LT) && (value === undefined || check.param < value)) {
                value = check.param;
            }
        }
        if (value === undefined) {
            return undefined;
        }
        let strict = false;
        for (const check of this._checks) {
            if (check.tag === TAG_LT && check.param === value) {
                strict = true;
            }
        }

        return { value, strict };
    }
}

const singleton = /* @__PURE__ */ new BigIntSchema();

/**
 * [BigInt](https://paseri.dev/reference/schema/primitives/bigint/) schema.
 */
const bigint = /* @__PURE__ */ (): BigIntSchema => singleton;

export { BigIntSchema, bigint };
