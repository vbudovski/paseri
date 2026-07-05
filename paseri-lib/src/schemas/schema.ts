import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { IR, IRContext, IRGraph } from '../introspect/ir.ts';
import type { CustomIssueCode, TreeNode } from '../issue.ts';
import type { Translations } from '../message.ts';
import type { InternalParseResult, ParseResult } from '../result.ts';
import { isParseSuccess, ParseErrorResult, PaseriError } from '../result.ts';
import { deepClone, deepFreeze } from '../utils.ts';

const DEFAULT_MAX_DEPTH = 1000;

interface ParseOptions {
    /** Caps the nesting depth of recursive input. Defaults to 1000. */
    maxDepth?: number;
}

/**
 * The abstract base class for all schemas, containing the [common](https://paseri.dev/reference/schema/common/)
 * interface.
 */
abstract class Schema<OutputType> implements StandardSchemaV1<unknown, OutputType> {
    get '~standard'(): StandardSchemaV1.Props<unknown, OutputType> {
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

    /**
     * Builds the intermediate representation node for this schema. Populated at runtime by the `./introspect`
     * side-effect subpath; calling it before importing that subpath fails with `_emit is not a function`.
     */
    declare _emit: (context: IRContext) => IR;
    /**
     * Produces the {@link IRGraph} for this schema — the input consumed by paseri-compiler. Populated at runtime by
     * the `./introspect` side-effect subpath; calling it before importing that subpath fails with
     * `toIR is not a function`.
     */
    declare toIR: () => IRGraph;

    protected abstract _clone(): Schema<OutputType>;
    public abstract _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<OutputType>;
    // This is to allow optional and nullable to be used together in any order.
    public _isOptional(): boolean {
        return false;
    }
    // Whether a default fires for undefined input. Nullable/refine delegate (like _isOptional); chain is
    // deliberately a semantic boundary for wrapper traits and does not.
    public _hasDefault(): boolean {
        return false;
    }
    public _unwrapOptional(): Schema<unknown> {
        return this;
    }
    parse(value: unknown, options?: ParseOptions): OutputType {
        const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
        if (!Number.isInteger(maxDepth) || maxDepth < 1) {
            throw new Error('maxDepth must be a positive integer.');
        }
        const issueOrSuccess = this._parse(value, 0, maxDepth);
        if (issueOrSuccess === undefined) {
            return value as OutputType;
        }
        if (isParseSuccess(issueOrSuccess)) {
            return issueOrSuccess.value;
        }
        throw new PaseriError(issueOrSuccess);
    }
    safeParse(value: unknown, options?: ParseOptions): ParseResult<OutputType> {
        const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
        if (!Number.isInteger(maxDepth) || maxDepth < 1) {
            throw new Error('maxDepth must be a positive integer.');
        }
        const issueOrSuccess = this._parse(value, 0, maxDepth);
        if (issueOrSuccess === undefined) {
            // We're dealing with a primitive value, and no issue was found, so just assert type and pass it through.
            return { ok: true, value: value as OutputType };
        }

        if (isParseSuccess(issueOrSuccess)) {
            return issueOrSuccess;
        }

        return new ParseErrorResult(issueOrSuccess);
    }
    optional(): OptionalSchema<OutputType, this> {
        return new OptionalSchema<OutputType, this>(this);
    }
    nullable(): NullableSchema<OutputType, this> {
        return new NullableSchema<OutputType, this>(this);
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
    ): RefineSchema<OutputType, this> {
        return new RefineSchema<OutputType, this>(this, predicate, options);
    }
}

// The inner schema type parameter preserves the concrete subclass through `.optional()`, so `.required()`
// (and any other unwrap) recovers it instead of the abstract base — mirrors `NullableSchema`.
class OptionalSchema<OutputType, InnerSchemaType extends Schema<OutputType> = Schema<OutputType>> extends Schema<
    OutputType | undefined
> {
    private readonly _schema: InnerSchemaType;

    constructor(schema: InnerSchemaType) {
        super();

        this._schema = schema;
    }
    protected _clone(): OptionalSchema<OutputType, InnerSchemaType> {
        return new OptionalSchema<OutputType, InnerSchemaType>(this._schema);
    }
    _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<OutputType | undefined> {
        if (value === undefined) {
            return undefined;
        }

        return this._schema._parse(value, _depth, _maxDepth);
    }
    override _isOptional(): boolean {
        return true;
    }
    override _unwrapOptional(): InnerSchemaType {
        return this._schema;
    }
    default(value: OutputType): DefaultSchema<OutputType> {
        return new DefaultSchema(this._schema, value);
    }
}

// The inner schema type parameter lets `Infer` see through nullable to an OptionalSchema underneath,
// mirroring the runtime's `_isOptional` delegation (optional and nullable compose in any order).
class NullableSchema<
    OutputType,
    InnerSchemaType extends Schema<OutputType> = Schema<OutputType>,
> extends Schema<OutputType | null> {
    private readonly _schema: InnerSchemaType;

    constructor(schema: InnerSchemaType) {
        super();

        this._schema = schema;
    }
    protected _clone(): NullableSchema<OutputType, InnerSchemaType> {
        return new NullableSchema<OutputType, InnerSchemaType>(this._schema);
    }
    _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<OutputType | null> {
        if (value === null) {
            return undefined;
        }

        return this._schema._parse(value, _depth, _maxDepth);
    }
    override _isOptional(): boolean {
        return this._schema._isOptional();
    }
    override _hasDefault(): boolean {
        return this._schema._hasDefault();
    }
    // Strip the optional layer from within, rebuilding nullable around the unwrapped inner so `.required()`
    // drops optionality but keeps nullable (matches TS `Required`).
    override _unwrapOptional(): Schema<unknown> {
        return new NullableSchema(this._schema._unwrapOptional());
    }
}

class ChainSchema<FromOutputType, ToOutputType> extends Schema<ToOutputType> {
    private readonly _fromSchema: Schema<FromOutputType>;
    private readonly _toSchema: Schema<ToOutputType>;
    private readonly _transformer: (value: FromOutputType) => ParseResult<ToOutputType>;

    /**
     * Populated by the `./introspect` side-effect subpath when it wraps `Schema.prototype.chain`. Stays `undefined`
     * for callers who never import introspect.
     */
    declare _callSiteFile?: string | undefined;

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
    _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<ToOutputType> {
        const issueOrSuccessFrom = this._fromSchema._parse(value, _depth, _maxDepth);

        // Invoke through a local so the transformer runs with `this` undefined rather than bound to this schema
        // instance (see the matching note in RefineSchema): a plain callback must not depend on a receiver.
        const transformer = this._transformer;
        let transformedResult: ParseResult<ToOutputType>;
        if (issueOrSuccessFrom === undefined) {
            transformedResult = transformer(value as FromOutputType);
        } else if (isParseSuccess(issueOrSuccessFrom)) {
            transformedResult = transformer(issueOrSuccessFrom.value);
        } else {
            return issueOrSuccessFrom;
        }

        if (!transformedResult.ok) {
            return transformedResult.issue;
        }

        const issueOrSuccessTo = this._toSchema._parse(transformedResult.value, _depth, _maxDepth);
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
        // A default must be a reproducible value the schema can clone to detach from the caller's reference
        // (and embed as a literal once compiled). A function or symbol is an opaque identity — structuredClone
        // rejects it and no literal expresses it — so it can be neither; reject it at construction.
        if (typeof value === 'function' || typeof value === 'symbol') {
            throw new Error(`A default value cannot be a ${typeof value}.`);
        }
        // Clone detaches from the caller's reference (deepClone is Temporal-aware; structuredClone throws on
        // Temporal) and freeze blocks mutation of parsed results, so a property added to a shared Temporal
        // instance can't leak across parses.
        this._default = deepFreeze(deepClone(value));
    }
    protected _clone(): DefaultSchema<OutputType> {
        return new DefaultSchema(this._schema, this._default);
    }
    _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<OutputType> {
        if (value === undefined) {
            return { ok: true, value: this._default };
        }

        return this._schema._parse(value, _depth, _maxDepth);
    }
    _getDefault(): OutputType {
        return this._default;
    }
    override _hasDefault(): boolean {
        return true;
    }
}

// The inner schema type parameter preserves the concrete base subclass through `.refine()`, and lets `Infer`
// recurse for key optionality — mirroring the runtime's `_isOptional`/`_hasDefault` delegation below.
class RefineSchema<
    OutputType,
    InnerSchemaType extends Schema<OutputType> = Schema<OutputType>,
> extends Schema<OutputType> {
    private readonly _base: InnerSchemaType;
    // Stored widened to `unknown`: a function field referencing OutputType is contravariant, which would make
    // RefineSchema (now exposed via `refine()`) invariant and break `Schema<T>` ⊆ `Schema<unknown>`. Sound —
    // the closure only ever sees a parsed OutputType (see `_parse`); the constructor param keeps callers precise.
    private readonly _predicate: (value: unknown) => boolean;
    private readonly _code: CustomIssueCode;
    private readonly _path: readonly (string | number)[];
    private readonly _params: Record<string, unknown> | undefined;

    /**
     * Populated by the `./introspect` side-effect subpath when it wraps `Schema.prototype.refine`. Stays `undefined`
     * for callers who never import introspect.
     */
    declare _callSiteFile?: string | undefined;

    constructor(
        base: InnerSchemaType,
        predicate: (value: OutputType) => boolean,
        options: { code: string; path?: (string | number)[]; params?: Record<string, unknown> },
    ) {
        super();

        this._base = base;
        this._predicate = predicate as (value: unknown) => boolean;
        this._code = options.code as CustomIssueCode;
        this._path = options.path ?? [];
        this._params = options.params;
    }
    protected _clone(): RefineSchema<OutputType, InnerSchemaType> {
        return this;
    }
    override _isOptional(): boolean {
        return this._base._isOptional();
    }
    override _hasDefault(): boolean {
        return this._base._hasDefault();
    }
    // Strip the optional layer from within, rebuilding refine around the unwrapped base so `.required()`
    // drops optionality but keeps the refinement (matches TS `Required`). Constructing directly bypasses the
    // introspect wrapper that records `_callSiteFile`, so carry it over to keep AOT compilation working.
    override _unwrapOptional(): Schema<unknown> {
        const unwrapped = new RefineSchema(this._base._unwrapOptional(), this._predicate, {
            code: this._code,
            path: [...this._path],
            ...(this._params !== undefined && { params: this._params }),
        });
        unwrapped._callSiteFile = this._callSiteFile;

        return unwrapped;
    }
    _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<OutputType> {
        const baseResult = this._base._parse(value, _depth, _maxDepth);

        if (baseResult !== undefined && !isParseSuccess(baseResult)) {
            return baseResult;
        }

        const parsed = baseResult === undefined ? (value as OutputType) : baseResult.value;

        // Invoke through a local so the predicate runs with `this` undefined rather than bound to this schema
        // instance. A predicate is a plain callback that must not depend on a receiver; binding it here only ever
        // exposed our private internals, which was never a supported contract.
        const predicate = this._predicate;
        if (predicate(parsed)) {
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

export type { AnySchemaType, ParseOptions };
export { ChainSchema, DefaultSchema, NullableSchema, OptionalSchema, RefineSchema, Schema };
