import { issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { boundsContradict } from '../utils.ts';
import { Schema } from './schema.ts';

const TAG_MIN = 0;
const TAG_MAX = 1;

interface PlainDateTimeCheck {
    tag: typeof TAG_MIN | typeof TAG_MAX;
    param: Temporal.PlainDateTime;
    // Precomputed at construction; only meaningful when boundIsIso (zero placeholders keep the shape monomorphic).
    boundIsIso: boolean;
    boundYear: number;
    boundMonth: number;
    boundDay: number;
    boundHour: number;
    boundMinute: number;
    boundSecond: number;
    boundMillisecond: number;
    boundMicrosecond: number;
    boundNanosecond: number;
    issue: TreeNode;
}

class PlainDateTimeSchema extends Schema<Temporal.PlainDateTime> {
    private _checks: PlainDateTimeCheck[] | undefined = undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Temporal.PlainDateTime' },
        TOO_DATED: { type: 'leaf', code: issueCodes.TOO_DATED },
        TOO_RECENT: { type: 'leaf', code: issueCodes.TOO_RECENT },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): PlainDateTimeSchema {
        const cloned = new PlainDateTimeSchema();
        cloned._checks = this._checks?.slice();

        return cloned;
    }
    _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<Temporal.PlainDateTime> {
        if (!(value instanceof Temporal.PlainDateTime)) {
            return this.issues.INVALID_TYPE;
        }

        if (this._checks !== undefined) {
            const checks = this._checks;
            // For iso8601 values the public getters equal the ISO slots that compare orders by;
            // other calendars diverge and take the exact compare call.
            const valueIsIso = value.calendarId === 'iso8601';
            let year = 0;
            let month = 0;
            let day = 0;
            let hour = 0;
            let minute = 0;
            let second = 0;
            let millisecond = 0;
            let microsecond = 0;
            let nanosecond = 0;
            if (valueIsIso) {
                year = value.year;
                month = value.month;
                day = value.day;
                hour = value.hour;
                minute = value.minute;
                second = value.second;
                millisecond = value.millisecond;
                microsecond = value.microsecond;
                nanosecond = value.nanosecond;
            }
            for (let i = 0; i < checks.length; i++) {
                const check = checks[i];
                let comparison: number;
                if (!check.boundIsIso || !valueIsIso) {
                    comparison = Temporal.PlainDateTime.compare(value, check.param);
                } else if (year !== check.boundYear) {
                    comparison = year < check.boundYear ? -1 : 1;
                } else if (month !== check.boundMonth) {
                    comparison = month < check.boundMonth ? -1 : 1;
                } else if (day !== check.boundDay) {
                    comparison = day < check.boundDay ? -1 : 1;
                } else if (hour !== check.boundHour) {
                    comparison = hour < check.boundHour ? -1 : 1;
                } else if (minute !== check.boundMinute) {
                    comparison = minute < check.boundMinute ? -1 : 1;
                } else if (second !== check.boundSecond) {
                    comparison = second < check.boundSecond ? -1 : 1;
                } else if (millisecond !== check.boundMillisecond) {
                    comparison = millisecond < check.boundMillisecond ? -1 : 1;
                } else if (microsecond !== check.boundMicrosecond) {
                    comparison = microsecond < check.boundMicrosecond ? -1 : 1;
                } else if (nanosecond !== check.boundNanosecond) {
                    comparison = nanosecond < check.boundNanosecond ? -1 : 1;
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
    min(value: Temporal.PlainDateTime): PlainDateTimeSchema {
        if (boundsContradict(this._checks, TAG_MAX, value, Temporal.PlainDateTime.compare, 1)) {
            throw new Error('Minimum must not exceed maximum.');
        }

        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        const boundIsIso = value.calendarId === 'iso8601';
        cloned._checks.push({
            tag: TAG_MIN,
            param: value,
            boundIsIso,
            boundYear: boundIsIso ? value.year : 0,
            boundMonth: boundIsIso ? value.month : 0,
            boundDay: boundIsIso ? value.day : 0,
            boundHour: boundIsIso ? value.hour : 0,
            boundMinute: boundIsIso ? value.minute : 0,
            boundSecond: boundIsIso ? value.second : 0,
            boundMillisecond: boundIsIso ? value.millisecond : 0,
            boundMicrosecond: boundIsIso ? value.microsecond : 0,
            boundNanosecond: boundIsIso ? value.nanosecond : 0,
            issue: this.issues.TOO_DATED,
        });

        return cloned;
    }
    max(value: Temporal.PlainDateTime): PlainDateTimeSchema {
        if (boundsContradict(this._checks, TAG_MIN, value, Temporal.PlainDateTime.compare, -1)) {
            throw new Error('Minimum must not exceed maximum.');
        }

        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        const boundIsIso = value.calendarId === 'iso8601';
        cloned._checks.push({
            tag: TAG_MAX,
            param: value,
            boundIsIso,
            boundYear: boundIsIso ? value.year : 0,
            boundMonth: boundIsIso ? value.month : 0,
            boundDay: boundIsIso ? value.day : 0,
            boundHour: boundIsIso ? value.hour : 0,
            boundMinute: boundIsIso ? value.minute : 0,
            boundSecond: boundIsIso ? value.second : 0,
            boundMillisecond: boundIsIso ? value.millisecond : 0,
            boundMicrosecond: boundIsIso ? value.microsecond : 0,
            boundNanosecond: boundIsIso ? value.nanosecond : 0,
            issue: this.issues.TOO_RECENT,
        });

        return cloned;
    }
}

const singleton = /* @__PURE__ */ new PlainDateTimeSchema();

/**
 * [PlainDateTime](https://paseri.dev/reference/schema/primitives/plain-date-time/) schema.
 */
const plainDateTime = /* @__PURE__ */ (): PlainDateTimeSchema => singleton;

export { PlainDateTimeSchema, plainDateTime };
