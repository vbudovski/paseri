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

	protected _parse(value: unknown): ValidationError[] {
		const errors: ValidationError[] = [];
		for (const check of this.checks) {
			const result = check(value as OutputType);
			if (result.status === 'error') {
				errors.push({ path: [], message: result.message });
			}
		}

		return errors;
	}

	parse(value: unknown): ParseResult<OutputType> {
		const errors = this._parse(value);
		if (errors.length) {
			return { status: 'error', errors: errors };
		}

		return { status: 'success', value: value as OutputType };
	}
}

export { Schema };
export type { ParseResult, ParseSuccessResult, ParseErrorResult, CheckResult, ValidationError };
