import { Schema, type ValidationError } from './schema.ts';

class NumberSchema extends Schema<number> {
    override _parse(value: unknown): ValidationError[] {
        if (typeof value !== 'number') {
            return [{ path: [], message: 'Not a number.' }];
        }

        return super._parse(value);
    }
    gte(value: number) {
        this.checks.push((_value) => {
            if (_value < value) {
                return { status: 'error', message: 'Too small.' };
            }

            return { status: 'success' };
        });

        return this;
    }
    gt(value: number) {
        this.checks.push((_value) => {
            if (_value <= value) {
                return { status: 'error', message: 'Too small.' };
            }

            return { status: 'success' };
        });

        return this;
    }
    lte(value: number) {
        this.checks.push((_value) => {
            if (_value > value) {
                return { status: 'error', message: 'Too large.' };
            }

            return { status: 'success' };
        });

        return this;
    }
    lt(value: number) {
        this.checks.push((_value) => {
            if (_value >= value) {
                return { status: 'error', message: 'Too large.' };
            }

            return { status: 'success' };
        });

        return this;
    }
    int() {
        this.checks.push((_value) => {
            if (!Number.isInteger(_value)) {
                return { status: 'error', message: 'Not an integer.' };
            }

            return { status: 'success' };
        });

        return this;
    }
    finite() {
        this.checks.push((_value) => {
            if (!Number.isFinite(_value)) {
                return { status: 'error', message: 'Not finite.' };
            }

            return { status: 'success' };
        });

        return this;
    }
    safe() {
        this.checks.push((_value) => {
            if (!Number.isSafeInteger(_value)) {
                return { status: 'error', message: 'Not safe integer.' };
            }

            return { status: 'success' };
        });

        return this;
    }
}

function number() {
    return new NumberSchema();
}

export { number };
