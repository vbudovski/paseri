import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class BigIntSchema extends Schema<bigint> {
    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
        TOO_SMALL: { type: 'leaf', code: 'too_small' },
        TOO_LARGE: { type: 'leaf', code: 'too_large' },
    } as const;

    _parse(value: unknown): InternalParseResult<bigint> {
        if (typeof value !== 'bigint') {
            return this.issues.INVALID_TYPE;
        }

        if (this.checks !== undefined) {
            const length = this.checks.length;
            for (let i = 0; i < length; i++) {
                const check = this.checks[i];
                const issue = check(value);
                if (issue) {
                    return issue;
                }
            }
        }

        return undefined;
    }
    gte(value: bigint) {
        this.addCheck((_value) => {
            if (_value < value) {
                return this.issues.TOO_SMALL;
            }

            return undefined;
        });

        return this;
    }
    gt(value: bigint) {
        this.addCheck((_value) => {
            if (_value <= value) {
                return this.issues.TOO_SMALL;
            }

            return undefined;
        });

        return this;
    }
    lte(value: bigint) {
        this.addCheck((_value) => {
            if (_value > value) {
                return this.issues.TOO_LARGE;
            }

            return undefined;
        });

        return this;
    }
    lt(value: bigint) {
        this.addCheck((_value) => {
            if (_value >= value) {
                return this.issues.TOO_LARGE;
            }

            return undefined;
        });

        return this;
    }
}

function bigint() {
    return new BigIntSchema();
}

export { bigint };
