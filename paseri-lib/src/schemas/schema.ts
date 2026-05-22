import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { CustomIssueCode, TreeNode } from '../issue.ts';
import type { Translations } from '../message.ts';
import type { InternalParseResult, ParseResult } from '../result.ts';
import { isParseSuccess, ParseErrorResult, PaseriError } from '../result.ts';
import { deepFreeze } from '../utils.ts';

/**
 * The abstract base class for all schemas, containing the [common](https://paseri.dev/reference/schema/common/)
 * interface.
 */
abstract class Schema<OutputType> implements StandardSchemaV1<unknown, OutputType> {
    get '~standard'(): StandardSchemaV1.Props<OutputType> {
        // deno-lint-ignore no-this-alias
        const self = this;

        return {
            version: 1,
            vendor: 'paseri',
            validate(
                value: unknown,
                options?: StandardSchemaV1.Options | undefined,
            ): StandardSchemaV1.Result<OutputType> {
                const result = self.safeParse(value);
                if (result.ok) {
                    return { value: result.value };
                }

                return { issues: result.messages(options?.libraryOptions?.locale as Translations | undefined) };
            },
        };
    }

    protected abstract _clone(): Schema<OutputType>;
    public abstract _parse(value: unknown): InternalParseResult<OutputType>;
    // This is to allow optional and nullable to be used together in any order.
    public _isOptional(): boolean {
        return false;
    }
    parse(value: unknown): OutputType {
        const result = this.safeParse(value);
        if (result.ok) {
            return result.value;
        }

        throw new PaseriError(result.issue);
    }
    safeParse(value: unknown): ParseResult<OutputType> {
        const issueOrSuccess = this._parse(value);
        if (issueOrSuccess === undefined) {
            // We're dealing with a primitive value, and no issue was found, so just assert type and pass it through.
            return { ok: true, value: value as OutputType };
        }

        if (isParseSuccess(issueOrSuccess)) {
            return issueOrSuccess;
        }

        return new ParseErrorResult(issueOrSuccess);
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
    refine(
        predicate: (value: OutputType) => boolean,
        options: { code: string; path?: (string | number)[]; params?: Record<string, unknown> },
    ): Schema<OutputType> {
        return new RefineSchema(this, predicate, options);
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
    override _isOptional(): boolean {
        return true;
    }
    default(value: OutputType): DefaultSchema<OutputType> {
        return new DefaultSchema(this._schema, value);
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
    override _isOptional(): boolean {
        return this._schema._isOptional();
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
            return { ok: true, value: transformedResult.value };
        }

        return issueOrSuccessTo;
    }
}

class DefaultSchema<OutputType> extends Schema<OutputType> {
    private readonly _schema: Schema<OutputType>;
    private readonly _default: OutputType;

    constructor(schema: Schema<OutputType>, value: OutputType) {
        super();

        this._schema = schema;
        // Clone detaches from the caller's reference, freeze blocks mutation of parsed results.
        this._default = deepFreeze(structuredClone(value));
    }
    protected _clone(): DefaultSchema<OutputType> {
        return new DefaultSchema(this._schema, this._default);
    }
    _parse(value: unknown): InternalParseResult<OutputType> {
        if (value === undefined) {
            return { ok: true, value: this._default };
        }

        return this._schema._parse(value);
    }
    _getDefault(): OutputType {
        return this._default;
    }
}

class RefineSchema<OutputType> extends Schema<OutputType> {
    private readonly _base: Schema<OutputType>;
    private readonly _predicate: (value: OutputType) => boolean;
    private readonly _code: CustomIssueCode;
    private readonly _path: readonly (string | number)[];
    private readonly _params: Record<string, unknown> | undefined;

    constructor(
        base: Schema<OutputType>,
        predicate: (value: OutputType) => boolean,
        options: { code: string; path?: (string | number)[]; params?: Record<string, unknown> },
    ) {
        super();

        this._base = base;
        this._predicate = predicate;
        this._code = options.code as CustomIssueCode;
        this._path = options.path ?? [];
        this._params = options.params;
    }
    protected _clone(): RefineSchema<OutputType> {
        return this;
    }
    override _isOptional(): boolean {
        return this._base._isOptional();
    }
    _parse(value: unknown): InternalParseResult<OutputType> {
        const baseResult = this._base._parse(value);

        if (baseResult !== undefined && !isParseSuccess(baseResult)) {
            return baseResult;
        }

        const parsed = baseResult === undefined ? (value as OutputType) : baseResult.value;

        if (this._predicate(parsed)) {
            return baseResult;
        }

        let issue: TreeNode = {
            type: 'leaf',
            code: this._code,
            ...(this._params !== undefined && { params: this._params }),
        };
        for (let i = this._path.length - 1; i >= 0; i--) {
            issue = { type: 'nest', key: this._path[i], child: issue };
        }
        return issue;
    }
}

type AnySchemaType = Schema<unknown>;

export type { AnySchemaType };
export { DefaultSchema, OptionalSchema, RefineSchema, Schema };
