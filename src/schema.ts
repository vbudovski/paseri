interface ParseSuccessResult<OutputType> {
	status: 'success';
	value: OutputType;
}
interface ParseErrorResult {
	status: 'error';
	errors: string[];
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

	parse(value: unknown): ParseResult<OutputType> {
		if (this.checks.length) {
			const errors: string[] = [];
			for (const check of this.checks) {
				const result = check(value as OutputType);
				if (result.status === 'error') {
					errors.push(result.message);
				}
			}

			if (errors.length) {
				return { status: 'error', errors };
			}
		}

		return { status: 'success', value: value as OutputType };
	}
}

export { Schema };
export type { ParseResult, ParseSuccessResult, ParseErrorResult };
