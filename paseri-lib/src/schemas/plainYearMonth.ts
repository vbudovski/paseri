import { issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

const TAG_MIN = 0;
const TAG_MAX = 1;

interface PlainYearMonthCheck {
    tag: typeof TAG_MIN | typeof TAG_MAX;
    param: Temporal.PlainYearMonth;
    issue: TreeNode;
}

class PlainYearMonthSchema extends Schema<Temporal.PlainYearMonth> {
    private _checks: PlainYearMonthCheck[] | undefined = undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Temporal.PlainYearMonth' },
        TOO_DATED: { type: 'leaf', code: issueCodes.TOO_DATED },
        TOO_RECENT: { type: 'leaf', code: issueCodes.TOO_RECENT },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): PlainYearMonthSchema {
        const cloned = new PlainYearMonthSchema();
        cloned._checks = this._checks?.slice();

        return cloned;
    }
    _parse(value: unknown): InternalParseResult<Temporal.PlainYearMonth> {
        if (!(value instanceof Temporal.PlainYearMonth)) {
            return this.issues.INVALID_TYPE;
        }

        if (this._checks !== undefined) {
            const checks = this._checks;
            for (let i = 0; i < checks.length; i++) {
                const { tag, param, issue } = checks[i];
                switch (tag) {
                    case TAG_MIN:
                        if (Temporal.PlainYearMonth.compare(value, param) < 0) {
                            return issue;
                        }
                        break;
                    case TAG_MAX:
                        if (Temporal.PlainYearMonth.compare(value, param) > 0) {
                            return issue;
                        }
                        break;
                }
            }
        }

        return undefined;
    }
    min(value: Temporal.PlainYearMonth): PlainYearMonthSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_MIN, param: value, issue: this.issues.TOO_DATED });

        return cloned;
    }
    max(value: Temporal.PlainYearMonth): PlainYearMonthSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_MAX, param: value, issue: this.issues.TOO_RECENT });

        return cloned;
    }
}

const singleton = /* @__PURE__ */ new PlainYearMonthSchema();

/**
 * [Plain year-month](https://paseri.dev/reference/schema/primitives/plainyearmonth/) schema.
 */
const plainYearMonth = /* @__PURE__ */ (): PlainYearMonthSchema => singleton;

export { plainYearMonth };
