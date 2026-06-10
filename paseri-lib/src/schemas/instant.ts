import { issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

const TAG_MIN = 0;
const TAG_MAX = 1;

interface InstantCheck {
    tag: typeof TAG_MIN | typeof TAG_MAX;
    param: Temporal.Instant;
    // Precomputed at construction so the hot path is a single bigint compare.
    boundEpochNanoseconds: bigint;
    issue: TreeNode;
}

class InstantSchema extends Schema<Temporal.Instant> {
    private _checks: InstantCheck[] | undefined = undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Temporal.Instant' },
        TOO_DATED: { type: 'leaf', code: issueCodes.TOO_DATED },
        TOO_RECENT: { type: 'leaf', code: issueCodes.TOO_RECENT },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): InstantSchema {
        const cloned = new InstantSchema();
        cloned._checks = this._checks?.slice();

        return cloned;
    }
    _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<Temporal.Instant> {
        if (!(value instanceof Temporal.Instant)) {
            return this.issues.INVALID_TYPE;
        }

        if (this._checks !== undefined) {
            const checks = this._checks;
            // One read per parse: the getter allocates a fresh BigInt.
            const epochNanoseconds = value.epochNanoseconds;
            for (let i = 0; i < checks.length; i++) {
                const { tag, boundEpochNanoseconds, issue } = checks[i];
                switch (tag) {
                    case TAG_MIN:
                        if (epochNanoseconds < boundEpochNanoseconds) {
                            return issue;
                        }
                        break;
                    case TAG_MAX:
                        if (epochNanoseconds > boundEpochNanoseconds) {
                            return issue;
                        }
                        break;
                }
            }
        }

        return undefined;
    }
    min(value: Temporal.Instant): InstantSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({
            tag: TAG_MIN,
            param: value,
            boundEpochNanoseconds: value.epochNanoseconds,
            issue: this.issues.TOO_DATED,
        });

        return cloned;
    }
    max(value: Temporal.Instant): InstantSchema {
        const cloned = this._clone();
        cloned._checks = cloned._checks || [];
        cloned._checks.push({
            tag: TAG_MAX,
            param: value,
            boundEpochNanoseconds: value.epochNanoseconds,
            issue: this.issues.TOO_RECENT,
        });

        return cloned;
    }
}

const singleton = /* @__PURE__ */ new InstantSchema();

/**
 * [Instant](https://paseri.dev/reference/schema/primitives/instant/) schema.
 */
const instant = /* @__PURE__ */ (): InstantSchema => singleton;

export { InstantSchema, instant };
