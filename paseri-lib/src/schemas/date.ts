import { issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

type CheckFunction = (value: Date) => TreeNode | undefined;

class DateSchema extends Schema<Date> {
    private _checks: CheckFunction[] | undefined = undefined;

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
            for (const check of this._checks) {
                const issue = check(value);
                if (issue) {
                    return issue;
                }
            }
        }

        return undefined;
    }
    min(value: Date): DateSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value < value) {
                return this.issues.TOO_DATED;
            }
        });

        return cloned;
    }
    max(length: Date): DateSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value > length) {
                return this.issues.TOO_RECENT;
            }
        });

        return cloned;
    }
}

const singleton = /* @__PURE__ */ new DateSchema();

/**
 * [Date](https://paseri.dev/reference/schema/primitives/date/) schema.
 */
const date = /* @__PURE__ */ (): DateSchema => singleton;

export { date };
