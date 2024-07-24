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

function ok<OutputType>(value: OutputType): ParseSuccessResult<OutputType> {
    return { ok: true, value };
}

function err(code: string): ParseErrorResult {
    return { ok: false, issue: { type: 'leaf', code } };
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

export { isIssue, isParseSuccess, ok, err };
export type { InternalParseResult, ParseResult };
