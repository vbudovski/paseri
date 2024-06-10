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
    errors: Readonly<ValidationError>[];
}

type ParseResult<OutputType> = ParseSuccessResult<OutputType> | ParseErrorResult;

abstract class Schema<OutputType> {
    protected checks: ((value: OutputType) => ParseErrorResult | undefined)[] = [];

    public abstract _parse(value: unknown): ParseResult<OutputType>;

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
export type { ParseResult, ParseSuccessResult, ParseErrorResult, ValidationError };
