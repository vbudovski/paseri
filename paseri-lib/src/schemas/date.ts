import { issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

const TAG_MIN = 0;
const TAG_MAX = 1;

interface DateCheck {
    tag: typeof TAG_MIN | typeof TAG_MAX;
    param: Date;
    issue: TreeNode;
}

class DateSchema extends Schema<Date> {
    private _checks: DateCheck[] | undefined = undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Date' },
        INVALID_DATE: { type: 'leaf', code: issueCodes.INVALID_DATE },
        TOO_DATED: { type: 'leaf', code: issueCodes.TOO_DATED },
        TOO_RECENT: { type: 'leaf', code: issueCodes.TOO_RECENT },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): DateSchema {
        const cloned = new DateSchema();
        cloned._checks = this._checks?.slice();

        return cloned;
    }
    _parse(value: unknown): InternalParseResult<Date> {
        if (!(value instanceof Date)) {
            return this.issues.INVALID_TYPE;
        }

        if (Number.isNaN(value.getTime())) {
            return this.issues.INVALID_DATE;
        }

        if (this._checks !== undefined) {
            const checks = this._checks;
            for (let i = 0; i < checks.length; i++) {
                const { tag, param, issue } = checks[i];
                switch (tag) {
                    case TAG_MIN:
                        if (value < param) {
                            return issue;
                        }
                        break;
                    case TAG_MAX:
                        if (value > param) {
                            return issue;
                        }
                        break;
                }
            }
        }

        return undefined;
    }
    min(value: Date): DateSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_MIN, param: value, issue: this.issues.TOO_DATED });

        return cloned;
    }
    max(length: Date): DateSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_MAX, param: length, issue: this.issues.TOO_RECENT });

        return cloned;
    }
}

const singleton = /* @__PURE__ */ new DateSchema();

/**
 * [Date](https://paseri.dev/reference/schema/primitives/date/) schema.
 */
const date = /* @__PURE__ */ (): DateSchema => singleton;

export { date };
