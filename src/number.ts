import { type ParseResult, Schema, type ValidationError } from './schema.ts';

class NumberSchema extends Schema<number> {
    private readonly issues: Record<string, [ValidationError]> = {
        INVALID_TYPE: [{ path: [], message: 'Not a number.' }],
        TOO_SMALL: [{ path: [], message: 'Too small.' }],
        TOO_LARGE: [{ path: [], message: 'Too large.' }],
        NOT_INTEGER: [{ path: [], message: 'Not an integer.' }],
        NOT_FINITE: [{ path: [], message: 'Not finite.' }],
        NOT_SAFE_INTEGER: [{ path: [], message: 'Not safe integer.' }],
    };

    _parse(value: unknown): ParseResult<number> {
        if (typeof value !== 'number') {
            return { status: 'error', errors: this.issues.INVALID_TYPE };
        }
        for (const check of this.checks) {
            const result = check(value);
            if (result) {
                return result;
            }
        }

        return { status: 'success', value: value as number };
    }
    gte(value: number) {
        this.checks.push((_value) => {
            if (_value < value) {
                return { status: 'error', errors: this.issues.TOO_SMALL };
            }

            return undefined;
        });

        return this;
    }
    gt(value: number) {
        this.checks.push((_value) => {
            if (_value <= value) {
                return { status: 'error', errors: this.issues.TOO_SMALL };
            }

            return undefined;
        });

        return this;
    }
    lte(value: number) {
        this.checks.push((_value) => {
            if (_value > value) {
                return { status: 'error', errors: this.issues.TOO_LARGE };
            }

            return undefined;
        });

        return this;
    }
    lt(value: number) {
        this.checks.push((_value) => {
            if (_value >= value) {
                return { status: 'error', errors: this.issues.TOO_LARGE };
            }

            return undefined;
        });

        return this;
    }
    int() {
        this.checks.push((_value) => {
            if (!Number.isInteger(_value)) {
                return { status: 'error', errors: this.issues.NOT_INTEGER };
            }

            return undefined;
        });

        return this;
    }
    finite() {
        this.checks.push((_value) => {
            if (!Number.isFinite(_value)) {
                return { status: 'error', errors: this.issues.NOT_FINITE };
            }

            return undefined;
        });

        return this;
    }
    safe() {
        this.checks.push((_value) => {
            if (!Number.isSafeInteger(_value)) {
                return { status: 'error', errors: this.issues.NOT_SAFE_INTEGER };
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
