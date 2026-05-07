import { issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

const TAG_MIN = 0;
const TAG_MAX = 1;

interface ZonedDateTimeCheck {
    tag: typeof TAG_MIN | typeof TAG_MAX;
    param: Temporal.ZonedDateTime;
    issue: TreeNode;
}

class ZonedDateTimeSchema extends Schema<Temporal.ZonedDateTime> {
    private _checks: ZonedDateTimeCheck[] | undefined = undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Temporal.ZonedDateTime' },
        TOO_DATED: { type: 'leaf', code: issueCodes.TOO_DATED },
        TOO_RECENT: { type: 'leaf', code: issueCodes.TOO_RECENT },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): ZonedDateTimeSchema {
        const cloned = new ZonedDateTimeSchema();
        cloned._checks = this._checks?.slice();

        return cloned;
    }
    _parse(value: unknown): InternalParseResult<Temporal.ZonedDateTime> {
        if (!(value instanceof Temporal.ZonedDateTime)) {
            return this.issues.INVALID_TYPE;
        }

        if (this._checks !== undefined) {
            const checks = this._checks;
            for (let i = 0; i < checks.length; i++) {
                const { tag, param, issue } = checks[i];
                switch (tag) {
                    case TAG_MIN:
                        if (Temporal.ZonedDateTime.compare(value, param) < 0) {
                            return issue;
                        }
                        break;
                    case TAG_MAX:
                        if (Temporal.ZonedDateTime.compare(value, param) > 0) {
                            return issue;
                        }
                        break;
                }
            }
        }

        return undefined;
    }
    min(value: Temporal.ZonedDateTime): ZonedDateTimeSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_MIN, param: value, issue: this.issues.TOO_DATED });

        return cloned;
    }
    max(value: Temporal.ZonedDateTime): ZonedDateTimeSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({ tag: TAG_MAX, param: value, issue: this.issues.TOO_RECENT });

        return cloned;
    }
}

const singleton = /* @__PURE__ */ new ZonedDateTimeSchema();

/**
 * [Zoned date-time](https://paseri.dev/reference/schema/primitives/zoneddatetime/) schema.
 */
const zonedDateTime = /* @__PURE__ */ (): ZonedDateTimeSchema => singleton;

export { zonedDateTime };
