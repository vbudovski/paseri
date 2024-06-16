import { type ParseResult, Schema } from './schema.ts';

class NumberSchema extends Schema<number> {
    _parse(value: unknown): ParseResult<number> {
        if (typeof value !== 'number') {
            return { ok: false, issue: { type: 'leaf', code: 'invalid_type' } };
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
                return { type: 'leaf', code: 'too_small' };
            }

            return undefined;
        });

        return this;
    }
    gt(value: number) {
        this.checks.push((_value) => {
            if (_value <= value) {
                return { type: 'leaf', code: 'too_small' };
            }

            return undefined;
        });

        return this;
    }
    lte(value: number) {
        this.checks.push((_value) => {
            if (_value > value) {
                return { type: 'leaf', code: 'too_large' };
            }

            return undefined;
        });

        return this;
    }
    lt(value: number) {
        this.checks.push((_value) => {
            if (_value >= value) {
                return { type: 'leaf', code: 'too_large' };
            }

            return undefined;
        });

        return this;
    }
    int() {
        this.checks.push((_value) => {
            if (!Number.isInteger(_value)) {
                return { type: 'leaf', code: 'invalid_integer' };
            }

            return undefined;
        });

        return this;
    }
    finite() {
        this.checks.push((_value) => {
            if (!Number.isFinite(_value)) {
                return { type: 'leaf', code: 'invalid_finite' };
            }

            return undefined;
        });

        return this;
    }
    safe() {
        this.checks.push((_value) => {
            if (!Number.isSafeInteger(_value)) {
                return { type: 'leaf', code: 'invalid_safe_integer' };
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
