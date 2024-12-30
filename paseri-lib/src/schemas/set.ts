import type { Infer } from '../infer.ts';
import { type LeafNode, type TreeNode, addIssue, issueCodes } from '../issue.ts';
import { type InternalParseResult, isIssue } from '../result.ts';
import type { AnySchemaType } from './schema.ts';
import { Schema } from './schema.ts';

class SetSchema<ElementSchemaType extends AnySchemaType> extends Schema<Infer<Set<ElementSchemaType>>> {
    private readonly _element: ElementSchemaType;
    private _minSize = 0;
    private _maxSize = Number.POSITIVE_INFINITY;

    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Set' },
        TOO_LONG: { type: 'leaf', code: issueCodes.TOO_LONG },
        TOO_SHORT: { type: 'leaf', code: issueCodes.TOO_SHORT },
    } as const satisfies Record<string, LeafNode>;

    constructor(element: ElementSchemaType) {
        super();

        this._element = element;
    }
    protected _clone(): SetSchema<ElementSchemaType> {
        const cloned = new SetSchema(this._element);
        cloned._minSize = this._minSize;
        cloned._maxSize = this._maxSize;

        return cloned;
    }
    _parse(value: unknown): InternalParseResult<Infer<Set<ElementSchemaType>>> {
        if (!(value instanceof Set)) {
            return this.issues.INVALID_TYPE;
        }

        const size = value.size;
        const maxSize = this._maxSize;
        const minSize = this._minSize;

        if (size > maxSize) {
            return this.issues.TOO_LONG;
        }

        if (size < minSize) {
            return this.issues.TOO_SHORT;
        }

        const schema = this._element;

        let issue: TreeNode | undefined = undefined;
        let i = 0;
        for (const childValue of value) {
            const issueOrSuccess = schema._parse(childValue);
            if (issueOrSuccess !== undefined && isIssue(issueOrSuccess)) {
                issue = addIssue(issue, { type: 'nest', key: i, child: issueOrSuccess });
            }
            i++;
        }

        if (issue) {
            return issue;
        }

        return undefined;
    }
    min(size: number): SetSchema<ElementSchemaType> {
        const cloned = this._clone();
        cloned._minSize = size;

        return cloned;
    }
    max(size: number): SetSchema<ElementSchemaType> {
        const cloned = this._clone();
        cloned._maxSize = size;

        return cloned;
    }
    size(size: number): SetSchema<ElementSchemaType> {
        const cloned = this._clone();
        cloned._minSize = size;
        cloned._maxSize = size;

        return cloned;
    }
}

const set = /* @__PURE__ */ <ElementSchemaType extends AnySchemaType>(
    ...args: ConstructorParameters<typeof SetSchema<ElementSchemaType>>
): SetSchema<ElementSchemaType> => new SetSchema(...args);

export { set };
