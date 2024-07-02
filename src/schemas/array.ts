import type { Infer } from '../index.ts';
import type { TreeNode } from '../issue.ts';
import { addIssue } from '../issue.ts';
import { type InternalParseResult, isIssue } from '../result.ts';
import { Schema } from './schema.ts';

// biome-ignore lint/suspicious/noExplicitAny: Required to accept any Schema variant.
type ValidElementSchemaType = Schema<any>;

class ArraySchema<ElementSchemaType extends ValidElementSchemaType> extends Schema<Infer<ElementSchemaType[]>> {
    private readonly _element: ElementSchemaType;
    private _minLength = 0;
    private _maxLength = Number.POSITIVE_INFINITY;

    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
        TOO_LONG: { type: 'leaf', code: 'too_long' },
        TOO_SHORT: { type: 'leaf', code: 'too_short' },
    } as const;

    constructor(element: ElementSchemaType) {
        super();

        this._element = element;
    }
    _parse(value: unknown): InternalParseResult<Infer<ElementSchemaType[]>> {
        if (!Array.isArray(value)) {
            return this.issues.INVALID_TYPE;
        }

        const length = value.length;
        const maxLength = this._maxLength;
        const minLength = this._minLength;

        if (length > maxLength) {
            return this.issues.TOO_LONG;
        }

        if (length < minLength) {
            return this.issues.TOO_SHORT;
        }

        const schema = this._element;

        let issue: TreeNode | undefined = undefined;
        for (let i = 0; i < length; i++) {
            const childValue = value[i];
            const issueOrSuccess = schema._parse(childValue);
            if (issueOrSuccess !== undefined && isIssue(issueOrSuccess)) {
                issue = addIssue(issue, { type: 'nest', key: i, child: issueOrSuccess });
            }
        }

        if (issue) {
            return issue;
        }

        return undefined;
    }
    min(length: number) {
        this._minLength = length;

        return this;
    }
    max(length: number) {
        this._maxLength = length;

        return this;
    }
    length(length: number) {
        this._minLength = length;
        this._maxLength = length;

        return this;
    }
}

function array<ElementSchemaType extends ValidElementSchemaType>(
    ...args: ConstructorParameters<typeof ArraySchema<ElementSchemaType>>
) {
    return new ArraySchema(...args);
}

export { array };
