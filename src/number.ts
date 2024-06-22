import { type ParseResult, Schema } from './schema.ts';

class NumberSchema extends Schema<number> {
    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
        TOO_SMALL: { type: 'leaf', code: 'too_small' },
        TOO_LARGE: { type: 'leaf', code: 'too_large' },
        INVALID_INTEGER: { type: 'leaf', code: 'invalid_integer' },
        INVALID_FINITE: { type: 'leaf', code: 'invalid_finite' },
        INVALID_SAFE_INTEGER: { type: 'leaf', code: 'invalid_safe_integer' },
    } as const;

    _parse(value: unknown): ParseResult<number> {
        if (typeof value !== 'number') {
            return { ok: false, issue: this.issues.INVALID_TYPE };
        }
        for (const check of this.checks) {
            const issue = check(value);
            if (issue) {
                return { ok: false, issue };
            }
        }

        return { ok: true, value: value as number };
    }
    gte(value: number) {
        this.checks.push((_value) => {
            if (_value < value) {
                return this.issues.TOO_SMALL;
            }

            return undefined;
        });

        return this;
    }
    gt(value: number) {
        this.checks.push((_value) => {
            if (_value <= value) {
                return this.issues.TOO_SMALL;
            }

            return undefined;
        });

        return this;
    }
    lte(value: number) {
        this.checks.push((_value) => {
            if (_value > value) {
                return this.issues.TOO_LARGE;
            }

            return undefined;
        });

        return this;
    }
    lt(value: number) {
        this.checks.push((_value) => {
            if (_value >= value) {
                return this.issues.TOO_LARGE;
            }

            return undefined;
        });

        return this;
    }
    int() {
        this.checks.push((_value) => {
            if (!Number.isInteger(_value)) {
                return this.issues.INVALID_INTEGER;
            }

            return undefined;
        });

        return this;
    }
    finite() {
        this.checks.push((_value) => {
            if (!Number.isFinite(_value)) {
                return this.issues.INVALID_FINITE;
            }

            return undefined;
        });

        return this;
    }
    safe() {
        this.checks.push((_value) => {
            if (!Number.isSafeInteger(_value)) {
                return this.issues.INVALID_SAFE_INTEGER;
            }

            return undefined;
        });

        return this;
    }
}

function number() {
    return new NumberSchema();
}

export { number };
