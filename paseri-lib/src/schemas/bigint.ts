import type { TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

type CheckFunction = (value: bigint) => TreeNode | undefined;

class BigIntSchema extends Schema<bigint> {
    private _checks: CheckFunction[] | undefined = undefined;

    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
        TOO_SMALL: { type: 'leaf', code: 'too_small' },
        TOO_LARGE: { type: 'leaf', code: 'too_large' },
    } as const;

    protected _clone(): BigIntSchema {
        const cloned = new BigIntSchema();
        cloned._checks = this._checks?.slice();

        return cloned;
    }
    _parse(value: unknown): InternalParseResult<bigint> {
        if (typeof value !== 'bigint') {
            return this.issues.INVALID_TYPE;
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
    gte(value: bigint): BigIntSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value < value) {
                return this.issues.TOO_SMALL;
            }
        });

        return cloned;
    }
    gt(value: bigint): BigIntSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value <= value) {
                return this.issues.TOO_SMALL;
            }
        });

        return cloned;
    }
    lte(value: bigint): BigIntSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value > value) {
                return this.issues.TOO_LARGE;
            }
        });

        return cloned;
    }
    lt(value: bigint): BigIntSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value >= value) {
                return this.issues.TOO_LARGE;
            }
        });

        return cloned;
    }
}

const singleton = new BigIntSchema();

function bigint(): BigIntSchema {
    return singleton;
}

export { bigint };
