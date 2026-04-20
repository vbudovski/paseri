import { issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

const TAG_GTE = 0;
const TAG_GT = 1;
const TAG_LTE = 2;
const TAG_LT = 3;
const TAG_INT = 4;
const TAG_FINITE = 5;
const TAG_SAFE = 6;

interface NumberCheck {
    tag:
        | typeof TAG_GTE
        | typeof TAG_GT
        | typeof TAG_LTE
        | typeof TAG_LT
        | typeof TAG_INT
        | typeof TAG_FINITE
        | typeof TAG_SAFE;
    param: number;
    issue: TreeNode;
}

class NumberSchema extends Schema<number> {
    private _checks: NumberCheck[] | undefined = undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'number' },
        TOO_SMALL: { type: 'leaf', code: issueCodes.TOO_SMALL },
        TOO_LARGE: { type: 'leaf', code: issueCodes.TOO_LARGE },
        INVALID_INTEGER: { type: 'leaf', code: issueCodes.INVALID_INTEGER },
        INVALID_FINITE: { type: 'leaf', code: issueCodes.INVALID_FINITE },
        INVALID_SAFE_INTEGER: { type: 'leaf', code: issueCodes.INVALID_SAFE_INTEGER },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): NumberSchema {
        const cloned = new NumberSchema();
        cloned._checks = this._checks?.slice();

        return cloned;
    }
    _parse(value: unknown): InternalParseResult<number> {
        if (typeof value !== 'number' || Number.isNaN(value)) {
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
                    case TAG_INT:
                        if (!Number.isInteger(value)) {
                            return issue;
                        }
                        break;
                    case TAG_FINITE:
                        if (!Number.isFinite(value)) {
                            return issue;
                        }
                        break;
                    case TAG_SAFE:
                        if (!Number.isSafeInteger(value)) {
                            return issue;
                        }
                        break;
                }
            }
        }

        return undefined;
    }
    gte(value: number): NumberSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_GTE, param: value, issue: this.issues.TOO_SMALL });

        return cloned;
    }
    gt(value: number): NumberSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_GT, param: value, issue: this.issues.TOO_SMALL });

        return cloned;
    }
    lte(value: number): NumberSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_LTE, param: value, issue: this.issues.TOO_LARGE });

        return cloned;
    }
    lt(value: number): NumberSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_LT, param: value, issue: this.issues.TOO_LARGE });

        return cloned;
    }
    int(): NumberSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_INT, param: 0, issue: this.issues.INVALID_INTEGER });

        return cloned;
    }
    finite(): NumberSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_FINITE, param: 0, issue: this.issues.INVALID_FINITE });

        return cloned;
    }
    safe(): NumberSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_SAFE, param: 0, issue: this.issues.INVALID_SAFE_INTEGER });

        return cloned;
    }
}

const singleton = /* @__PURE__ */ new NumberSchema();

/**
 * [Number](https://paseri.dev/reference/schema/primitives/number/) schema.
 */
const number = /* @__PURE__ */ (): NumberSchema => singleton;

export { number };
