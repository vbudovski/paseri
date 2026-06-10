import { issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

const TAG_MIN = 0;
const TAG_MAX = 1;

interface PlainTimeCheck {
    tag: typeof TAG_MIN | typeof TAG_MAX;
    param: Temporal.PlainTime;
    // Precomputed at construction: PlainTime ordering is defined purely by these fields.
    boundHour: number;
    boundMinute: number;
    boundSecond: number;
    boundMillisecond: number;
    boundMicrosecond: number;
    boundNanosecond: number;
    issue: TreeNode;
}

class PlainTimeSchema extends Schema<Temporal.PlainTime> {
    private _checks: PlainTimeCheck[] | undefined = undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Temporal.PlainTime' },
        TOO_DATED: { type: 'leaf', code: issueCodes.TOO_DATED },
        TOO_RECENT: { type: 'leaf', code: issueCodes.TOO_RECENT },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): PlainTimeSchema {
        const cloned = new PlainTimeSchema();
        cloned._checks = this._checks?.slice();

        return cloned;
    }
    _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<Temporal.PlainTime> {
        if (!(value instanceof Temporal.PlainTime)) {
            return this.issues.INVALID_TYPE;
        }

        if (this._checks !== undefined) {
            const checks = this._checks;
            const hour = value.hour;
            const minute = value.minute;
            const second = value.second;
            const millisecond = value.millisecond;
            const microsecond = value.microsecond;
            const nanosecond = value.nanosecond;
            for (let i = 0; i < checks.length; i++) {
                const check = checks[i];
                let comparison: number;
                if (hour !== check.boundHour) {
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
    min(value: Temporal.PlainTime): PlainTimeSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({
            tag: TAG_MIN,
            param: value,
            boundHour: value.hour,
            boundMinute: value.minute,
            boundSecond: value.second,
            boundMillisecond: value.millisecond,
            boundMicrosecond: value.microsecond,
            boundNanosecond: value.nanosecond,
            issue: this.issues.TOO_DATED,
        });

        return cloned;
    }
    max(value: Temporal.PlainTime): PlainTimeSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({
            tag: TAG_MAX,
            param: value,
            boundHour: value.hour,
            boundMinute: value.minute,
            boundSecond: value.second,
            boundMillisecond: value.millisecond,
            boundMicrosecond: value.microsecond,
            boundNanosecond: value.nanosecond,
            issue: this.issues.TOO_RECENT,
        });

        return cloned;
    }
}

const singleton = /* @__PURE__ */ new PlainTimeSchema();

/**
 * [PlainTime](https://paseri.dev/reference/schema/primitives/plain-time/) schema.
 */
const plainTime = /* @__PURE__ */ (): PlainTimeSchema => singleton;

export { PlainTimeSchema, plainTime };
