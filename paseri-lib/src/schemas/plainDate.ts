import { issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

const TAG_MIN = 0;
const TAG_MAX = 1;

interface PlainDateCheck {
    tag: typeof TAG_MIN | typeof TAG_MAX;
    param: Temporal.PlainDate;
    issue: TreeNode;
}

class PlainDateSchema extends Schema<Temporal.PlainDate> {
    private _checks: PlainDateCheck[] | undefined = undefined;

    private readonly issues = {
        INVALID_TYPE: {
            type: 'leaf',
            code: issueCodes.INVALID_TYPE,
            expected: 'Temporal.PlainDate',
        },
        TOO_DATED: { type: 'leaf', code: issueCodes.TOO_DATED },
        TOO_RECENT: { type: 'leaf', code: issueCodes.TOO_RECENT },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): PlainDateSchema {
        const cloned = new PlainDateSchema();
        cloned._checks = this._checks?.slice();

        return cloned;
    }
    _parse(value: unknown): InternalParseResult<Temporal.PlainDate> {
        if (!(value instanceof Temporal.PlainDate)) {
            return this.issues.INVALID_TYPE;
        }

        if (this._checks !== undefined) {
            const checks = this._checks;
            for (let i = 0; i < checks.length; i++) {
                const { tag, param, issue } = checks[i];
                switch (tag) {
                    case TAG_MIN:
                        if (Temporal.PlainDate.compare(value, param) < 0) {
                            return issue;
                        }
                        break;
                    case TAG_MAX:
                        if (Temporal.PlainDate.compare(value, param) > 0) {
                            return issue;
                        }
                        break;
                }
            }
        }

        return undefined;
    }
    min(value: Temporal.PlainDate): PlainDateSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({
            tag: TAG_MIN,
            param: value,
            issue: this.issues.TOO_DATED,
        });

        return cloned;
    }
    max(value: Temporal.PlainDate): PlainDateSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({
            tag: TAG_MAX,
            param: value,
            issue: this.issues.TOO_RECENT,
        });

        return cloned;
    }
}

const singleton = /* @__PURE__ */ new PlainDateSchema();

/**
 * [PlainDate](https://paseri.dev/reference/schema/primitives/plain-date/) schema.
 */
const plainDate = /* @__PURE__ */ (): PlainDateSchema => singleton;

export { plainDate };
