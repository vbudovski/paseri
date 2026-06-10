import { issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

const TAG_MIN = 0;
const TAG_MAX = 1;

interface PlainYearMonthCheck {
    tag: typeof TAG_MIN | typeof TAG_MAX;
    param: Temporal.PlainYearMonth;
    // Precomputed at construction; only meaningful when boundIsIso (zero placeholders keep the shape monomorphic).
    boundIsIso: boolean;
    boundYear: number;
    boundMonth: number;
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
    _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<Temporal.PlainYearMonth> {
        if (!(value instanceof Temporal.PlainYearMonth)) {
            return this.issues.INVALID_TYPE;
        }

        if (this._checks !== undefined) {
            const checks = this._checks;
            // For iso8601 values the public getters equal the ISO slots that compare orders by;
            // other calendars diverge and take the exact compare call.
            const valueIsIso = value.calendarId === 'iso8601';
            let year = 0;
            let month = 0;
            if (valueIsIso) {
                year = value.year;
                month = value.month;
            }
            for (let i = 0; i < checks.length; i++) {
                const check = checks[i];
                let comparison: number;
                if (!check.boundIsIso || !valueIsIso) {
                    comparison = Temporal.PlainYearMonth.compare(value, check.param);
                } else if (year !== check.boundYear) {
                    comparison = year < check.boundYear ? -1 : 1;
                } else if (month !== check.boundMonth) {
                    comparison = month < check.boundMonth ? -1 : 1;
                } else {
                    comparison = 0;
                }
                switch (check.tag) {
                    case TAG_MIN:
                        if (comparison < 0) {
                            return check.issue;
                        }
                        break;
                    case TAG_MAX:
                        if (comparison > 0) {
                            return check.issue;
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
        const boundIsIso = value.calendarId === 'iso8601';
        cloned._checks.push({
            tag: TAG_MIN,
            param: value,
            boundIsIso,
            boundYear: boundIsIso ? value.year : 0,
            boundMonth: boundIsIso ? value.month : 0,
            issue: this.issues.TOO_DATED,
        });

        return cloned;
    }
    max(value: Temporal.PlainYearMonth): PlainYearMonthSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        const boundIsIso = value.calendarId === 'iso8601';
        cloned._checks.push({
            tag: TAG_MAX,
            param: value,
            boundIsIso,
            boundYear: boundIsIso ? value.year : 0,
            boundMonth: boundIsIso ? value.month : 0,
            issue: this.issues.TOO_RECENT,
        });

        return cloned;
    }
}

const singleton = /* @__PURE__ */ new PlainYearMonthSchema();

/**
 * [PlainYearMonth](https://paseri.dev/reference/schema/primitives/plain-year-month/) schema.
 */
const plainYearMonth = /* @__PURE__ */ (): PlainYearMonthSchema => singleton;

export { PlainYearMonthSchema, plainYearMonth };
