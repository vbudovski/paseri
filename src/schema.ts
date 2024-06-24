import type { TreeNode } from './issue.ts';

interface ParseSuccessResult<OutputType> {
    ok: true;
    value: OutputType;
}

interface ValidationError {
    path: string[];
    message: string;
}

interface ParseErrorResult {
    ok: false;
    issue: TreeNode;
}

type ParseResult<OutputType> = ParseSuccessResult<OutputType> | ParseErrorResult;

abstract class Schema<OutputType> {
    protected checks: ((value: OutputType) => TreeNode | undefined)[] = [];

    public abstract _parse(value: unknown): ParseResult<OutputType>;

    parse(value: unknown): OutputType {
        const result = this._parse(value);
        if (!result.ok) {
            throw new Error(`Failed to parse ${JSON.stringify(result.issue)}.`);
        }

        return result.value;
    }
    safeParse(value: unknown): ParseResult<OutputType> {
        return this._parse(value);
    }
}

export { Schema };
export type { ParseResult, ValidationError };
