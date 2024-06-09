interface ParseSuccessResult<OutputType> {
    status: 'success';
    value: OutputType;
}

interface ValidationError {
    path: string[];
    message: string;
}

interface ParseErrorResult {
    status: 'error';
    errors: ValidationError[];
}

type ParseResult<OutputType> = ParseSuccessResult<OutputType> | ParseErrorResult;

interface CheckSuccessResult {
    status: 'success';
}

interface CheckErrorResult {
    status: 'error';
    message: string;
}

type CheckResult = CheckSuccessResult | CheckErrorResult;

abstract class Schema<OutputType> {
    protected checks: ((value: OutputType) => CheckResult)[] = [];

    protected _parse(value: unknown): ParseResult<OutputType> {
        const errors: ValidationError[] = [];
        for (const check of this.checks) {
            const result = check(value as OutputType);
            if (result.status === 'error') {
                errors.push({ path: [], message: result.message });
            }
        }

        if (errors.length) {
            return { status: 'error', errors };
        }

        return { status: 'success', value: value as OutputType };
    }

    parse(value: unknown): OutputType {
        const result = this._parse(value);
        if (result.status === 'error') {
            throw new Error(`Failed to parse ${JSON.stringify(result.errors)}.`);
        }

        return result.value;
    }

    safeParse(value: unknown): ParseResult<OutputType> {
        return this._parse(value);
    }
}

export { Schema };
export type { ParseResult, ParseSuccessResult, ParseErrorResult, CheckResult, ValidationError };
