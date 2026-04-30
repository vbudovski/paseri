import { TAG_MAX_DATE, TAG_MIN_DATE } from '../checks/tags.ts';
import { issueCodes, type LeafNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import type { Check } from './schema.ts';
import { Schema } from './schema.ts';

class DateSchema extends Schema<Date> {
    private readonly _checks: readonly Check[] | undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Date' },
        INVALID_DATE: { type: 'leaf', code: issueCodes.INVALID_DATE },
    } as const satisfies Record<string, LeafNode>;

    constructor(checks?: readonly Check[]) {
        super();

        this._checks = checks;
    }
    protected _clone(): DateSchema {
        return new DateSchema(this._checks);
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
                const check = checks[i];
                switch (check.tag) {
                    case TAG_MIN_DATE:
                        if (value < check.param) {
                            return check.issue;
                        }
                        break;
                    case TAG_MAX_DATE:
                        if (value > check.param) {
                            return check.issue;
                        }
                        break;
                }
            }
        }

        return undefined;
    }
}

const singleton = /* @__PURE__ */ new DateSchema();

/**
 * [Date](https://paseri.dev/reference/schema/primitives/date/) schema.
 */
const date = /* @__PURE__ */ (...checks: Check[]): DateSchema =>
    checks.length === 0 ? singleton : new DateSchema(checks);

export { date };
