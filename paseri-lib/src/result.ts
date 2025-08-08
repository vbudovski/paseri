import type { CustomIssueCode, Message, TreeNode } from './issue.ts';
import { en } from './locales/index.ts';
import { messageList, type Translations } from './message.ts';

interface ParseSuccessResult<OutputType> {
    readonly ok: true;
    readonly value: OutputType;
}

interface ParseErrorResultInterface {
    readonly ok: false;
    readonly issue: TreeNode;
    readonly messages: (locale?: Translations) => readonly Message[];
}

class ParseErrorResult implements ParseErrorResultInterface {
    readonly ok = false as const;
    private readonly _issue: TreeNode;
    private _messageList: readonly Message[] | undefined;

    constructor(issue: TreeNode) {
        this._issue = issue;
    }
    get issue(): TreeNode {
        return this._issue;
    }
    messages(locale: Translations = en): readonly Message[] {
        if (this._messageList === undefined) {
            this._messageList = messageList(this._issue, locale);
        }

        return this._messageList;
    }
}

/**
 * `PaseriError` is thrown from `parse` when the data being validated does not adhere to the expected schema.
 */
class PaseriError extends Error {
    private readonly _issue: TreeNode;
    private _messageList: readonly Message[] | undefined;

    constructor(issue: TreeNode) {
        super('Failed to parse. See `e.messages()` for details.');

        this._issue = issue;
    }

    /**
     * Retrieve the error messages for a parsing failure.
     * @param locale The locale to use for error messages.
     */
    messages(locale: Translations = en): readonly Message[] {
        if (this._messageList === undefined) {
            this._messageList = messageList(this._issue, locale);
        }

        return this._messageList;
    }
}

type ParseResult<OutputType> = ParseSuccessResult<OutputType> | ParseErrorResultInterface;

/**
 * Indicates a successful parse result.
 * @param value The result of the successful parsing.
 */
function ok<OutputType>(value: OutputType): ParseSuccessResult<OutputType> {
    return { ok: true, value };
}

/**
 * Indicates an error parse result.
 * @param code The error code indicating the specific parsing failure.
 */
function err(code: string): ParseErrorResult {
    return new ParseErrorResult({ type: 'leaf', code: code as CustomIssueCode });
}

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

export { isIssue, isParseSuccess, ok, err, PaseriError, ParseErrorResult };
export type { InternalParseResult, ParseResult };
