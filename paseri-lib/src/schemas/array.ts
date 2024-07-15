import type { Infer } from '../index.ts';
import type { TreeNode } from '../issue.ts';
import { addIssue } from '../issue.ts';
import { type InternalParseResult, isIssue } from '../result.ts';
import { type AnySchemaType, Schema } from './schema.ts';

class ArraySchema<ElementSchemaType extends AnySchemaType> extends Schema<Infer<ElementSchemaType[]>> {
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
    protected _clone(): ArraySchema<ElementSchemaType> {
        const cloned = new ArraySchema(this._element);
        cloned._minLength = this._minLength;
        cloned._maxLength = this._maxLength;

        return cloned;
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
    min(length: number): ArraySchema<ElementSchemaType> {
        const cloned = this._clone();
        cloned._minLength = length;

        return cloned;
    }
    max(length: number): ArraySchema<ElementSchemaType> {
        const cloned = this._clone();
        cloned._maxLength = length;

        return cloned;
    }
    length(length: number): ArraySchema<ElementSchemaType> {
        const cloned = this._clone();
        cloned._minLength = length;
        cloned._maxLength = length;

        return cloned;
    }
}

function array<ElementSchemaType extends AnySchemaType>(
    ...args: ConstructorParameters<typeof ArraySchema<ElementSchemaType>>
): ArraySchema<ElementSchemaType> {
    return new ArraySchema(...args);
}

export { array };
