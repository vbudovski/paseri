import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { TreeNode } from '../issue.ts';
import type { Translations } from '../message.ts';
import type { InternalParseResult, ParseResult } from '../result.ts';
import { isParseSuccess, ParseErrorResult, PaseriError } from '../result.ts';

interface Check {
    readonly tag: number;
    // biome-ignore lint/suspicious/noExplicitAny: Param type varies by check tag.
    readonly param: any;
    readonly issue: TreeNode;
}

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
}

type AnySchemaType = Schema<unknown>;

export type { AnySchemaType, Check };
export { Schema };
