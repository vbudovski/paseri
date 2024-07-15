import type { TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

type CheckFunction = (value: number) => TreeNode | undefined;

class NumberSchema extends Schema<number> {
    private _checks: CheckFunction[] | undefined = undefined;

    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
        TOO_SMALL: { type: 'leaf', code: 'too_small' },
        TOO_LARGE: { type: 'leaf', code: 'too_large' },
        INVALID_INTEGER: { type: 'leaf', code: 'invalid_integer' },
        INVALID_FINITE: { type: 'leaf', code: 'invalid_finite' },
        INVALID_SAFE_INTEGER: { type: 'leaf', code: 'invalid_safe_integer' },
    } as const;

    protected _clone(): NumberSchema {
        const cloned = new NumberSchema();
        cloned._checks = this._checks?.slice();

        return cloned;
    }
    _parse(value: unknown): InternalParseResult<number> {
        if (typeof value !== 'number') {
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
    gte(value: number): NumberSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value < value) {
                return this.issues.TOO_SMALL;
            }
        });

        return cloned;
    }
    gt(value: number): NumberSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value <= value) {
                return this.issues.TOO_SMALL;
            }
        });

        return cloned;
    }
    lte(value: number): NumberSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value > value) {
                return this.issues.TOO_LARGE;
            }
        });

        return cloned;
    }
    lt(value: number): NumberSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value >= value) {
                return this.issues.TOO_LARGE;
            }
        });

        return cloned;
    }
    int(): NumberSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!Number.isInteger(_value)) {
                return this.issues.INVALID_INTEGER;
            }
        });

        return cloned;
    }
    finite(): NumberSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!Number.isFinite(_value)) {
                return this.issues.INVALID_FINITE;
            }
        });

        return cloned;
    }
    safe(): NumberSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!Number.isSafeInteger(_value)) {
                return this.issues.INVALID_SAFE_INTEGER;
            }
        });

        return cloned;
    }
}

const singleton = new NumberSchema();

function number(): NumberSchema {
    return singleton;
}

export { number };
