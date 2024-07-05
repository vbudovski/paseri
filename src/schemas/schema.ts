import type { TreeNode } from '../issue.ts';
import { isParseSuccess } from '../result.ts';
import type { InternalParseResult, ParseResult } from '../result.ts';

type CheckFunction<OutputType> = (value: OutputType) => TreeNode | undefined;

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

// biome-ignore lint/suspicious/noExplicitAny: Required to accept any Schema variant.
type AnySchemaType = Schema<any>;

export { Schema, OptionalSchema };
export type { AnySchemaType };
