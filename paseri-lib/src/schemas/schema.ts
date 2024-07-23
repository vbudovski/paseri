import { isParseSuccess, ok } from '../result.ts';
import type { InternalParseResult, ParseResult } from '../result.ts';

abstract class Schema<OutputType> {
    protected abstract _clone(): Schema<OutputType>;
    public abstract _parse(value: unknown): InternalParseResult<OutputType>;
    parse(value: unknown): OutputType {
        const result = this.safeParse(value);
        if (result.ok) {
            return result.value;
        }

        throw new Error(`Failed to parse ${JSON.stringify(result.issue)}.`);
    }
    safeParse(value: unknown): ParseResult<OutputType> {
        const issueOrSuccess = this._parse(value);
        if (issueOrSuccess === undefined) {
            // We're dealing with a primitive value, and no issue was found, so just assert type and pass it through.
            return ok(value as OutputType);
        }

        if (isParseSuccess(issueOrSuccess)) {
            return issueOrSuccess;
        }

        return { ok: false, issue: issueOrSuccess };
    }
    optional(): OptionalSchema<OutputType> {
        return new OptionalSchema(this);
    }
    nullable(): NullableSchema<OutputType> {
        return new NullableSchema(this);
    }
    chain<ToOutputType>(
        schema: Schema<ToOutputType>,
        transformer: (value: OutputType) => ParseResult<ToOutputType>,
    ): Schema<ToOutputType> {
        return new ChainSchema(this, schema, transformer);
    }
}

class OptionalSchema<OutputType> extends Schema<OutputType | undefined> {
    private readonly _schema: Schema<OutputType>;

    constructor(schema: Schema<OutputType>) {
        super();

        this._schema = schema;
    }
    protected _clone(): OptionalSchema<OutputType> {
        return new OptionalSchema(this._schema);
    }
    _parse(value: unknown): InternalParseResult<OutputType | undefined> {
        if (value === undefined) {
            return undefined;
        }

        return this._schema._parse(value);
    }
}

class NullableSchema<OutputType> extends Schema<OutputType | null> {
    private readonly _schema: Schema<OutputType>;

    constructor(schema: Schema<OutputType>) {
        super();

        this._schema = schema;
    }
    protected _clone(): NullableSchema<OutputType> {
        return new NullableSchema(this._schema);
    }
    _parse(value: unknown): InternalParseResult<OutputType | null> {
        if (value === null) {
            return undefined;
        }

        return this._schema._parse(value);
    }
}

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
            return ok(transformedResult.value);
        }

        return issueOrSuccessTo;
    }
}

// biome-ignore lint/suspicious/noExplicitAny: Required to accept any Schema variant.
type AnySchemaType = Schema<any>;

export { Schema, OptionalSchema };
export type { AnySchemaType };
