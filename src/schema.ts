import type { Simplify } from 'type-fest';
import type { TreeNode } from './issue.ts';

interface ParseSuccessResult<OutputType> {
    readonly ok: true;
    readonly value: OutputType;
}

interface ParseErrorResult {
    readonly ok: false;
    readonly issue: TreeNode;
}

type ParseResult<OutputType> = ParseSuccessResult<OutputType> | ParseErrorResult;

type CheckFunction<OutputType> = (value: OutputType) => TreeNode | undefined;

// To avoid creating intermediate objects, we return `undefined` when the input value does not need to be sanitised.
// Primitive values can just be passed straight through in the `parse` and `safeParse` functions, and `undefined`
// signals this.
type InternalParseResult<OutputType> = ParseSuccessResult<OutputType> | TreeNode | undefined;

// biome-ignore lint/suspicious/noExplicitAny: Needed to be able to assert Record is ParseSuccessResult.
function isParseSuccess<OutputType>(value: Record<string, any>): value is ParseSuccessResult<OutputType> {
    return value.ok === true;
}

// biome-ignore lint/suspicious/noExplicitAny: Needed to be able to assert Record is TreeNode.
function isIssue(value: Record<string, any>): value is TreeNode {
    return typeof value.type === 'string';
}

abstract class Schema<OutputType> {
    protected checks: CheckFunction<OutputType>[] | undefined = undefined;

    protected addCheck(check: CheckFunction<OutputType>) {
        if (this.checks === undefined) {
            this.checks = [check];
        } else {
            this.checks.push(check);
        }
    }
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
            return { ok: true, value: value as OutputType };
        }

        if (isParseSuccess(issueOrSuccess)) {
            return issueOrSuccess;
        }

        return { ok: false, issue: issueOrSuccess };
    }
    optional() {
        return new OptionalSchema(this);
    }
}

class OptionalSchema<OutputType> extends Schema<OutputType | undefined> {
    private readonly _schema: Schema<OutputType>;

    constructor(schema: Schema<OutputType>) {
        super();

        this._schema = schema;
    }
    _parse(value: unknown): InternalParseResult<OutputType | undefined> {
        if (value === undefined) {
            return value;
        }

        return this._schema._parse(value);
    }
}

type InferMapped<SchemaType> = {
    [Key in keyof SchemaType]: SchemaType[Key] extends Schema<infer OutputType> ? OutputType : never;
};

type Infer<SchemaType> = Simplify<
    // biome-ignore lint/suspicious/noExplicitAny: Required to accept any Schema variant.
    SchemaType extends Readonly<Array<Schema<any>>>
        ? InferMapped<SchemaType>
        : // biome-ignore lint/suspicious/noExplicitAny: Required to accept any Schema variant.
          SchemaType extends Readonly<Record<string | number | symbol, Schema<any>>>
          ? InferMapped<SchemaType>
          : SchemaType extends Schema<infer OutputType>
            ? OutputType
            : never
>;

export { Schema, isParseSuccess, isIssue };
export type { Infer, InternalParseResult };
