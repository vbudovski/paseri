import type { InternalParseResult, ParseResult } from '../result.ts';
import { isParseSuccess } from '../result.ts';
import { Schema } from './schema.ts';

class ChainSchema<FromOutputType, ToOutputType> extends Schema<ToOutputType> {
    private readonly _fromSchema: Schema<FromOutputType>;
    private readonly _toSchema: Schema<ToOutputType>;
    private readonly _transformer: (value: FromOutputType) => ParseResult<ToOutputType>;

    constructor(
        fromSchema: Schema<FromOutputType>,
        toSchema: Schema<ToOutputType>,
        transformer: (value: FromOutputType) => ParseResult<ToOutputType>,
    ) {
        super();

        this._fromSchema = fromSchema;
        this._toSchema = toSchema;
        this._transformer = transformer;
    }
    protected _clone(): ChainSchema<FromOutputType, ToOutputType> {
        return this;
    }
    _parse(value: unknown): InternalParseResult<ToOutputType> {
        const issueOrSuccessFrom = this._fromSchema._parse(value);

        let transformedResult: ParseResult<ToOutputType>;
        if (issueOrSuccessFrom === undefined) {
            transformedResult = this._transformer(value as FromOutputType);
        } else if (isParseSuccess(issueOrSuccessFrom)) {
            transformedResult = this._transformer(issueOrSuccessFrom.value);
        } else {
            return issueOrSuccessFrom;
        }

        if (!transformedResult.ok) {
            return transformedResult.issue;
        }

        const issueOrSuccessTo = this._toSchema._parse(transformedResult.value);
        if (issueOrSuccessTo === undefined) {
            return { ok: true, value: transformedResult.value };
        }

        return issueOrSuccessTo;
    }
}

function chain<FromOutputType, ToOutputType>(
    fromSchema: Schema<FromOutputType>,
    toSchema: Schema<ToOutputType>,
    transformer: (value: FromOutputType) => ParseResult<ToOutputType>,
): Schema<ToOutputType> {
    return new ChainSchema(fromSchema, toSchema, transformer);
}

export { chain };
