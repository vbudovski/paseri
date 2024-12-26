import type { Infer } from '../infer.ts';
import { type LeafNode, type TreeNode, addIssue, issueCodes } from '../issue.ts';
import { type InternalParseResult, isIssue } from '../result.ts';
import type { AnySchemaType } from './schema.ts';
import { Schema } from './schema.ts';

class MapSchema<
    ElementKeySchemaType extends AnySchemaType,
    ElementValueSchemaType extends AnySchemaType,
> extends Schema<Infer<Map<ElementKeySchemaType, ElementValueSchemaType>>> {
    private readonly _element: [ElementKeySchemaType, ElementValueSchemaType];
    private _minSize = 0;
    private _maxSize = Number.POSITIVE_INFINITY;

    readonly issues: Record<string, LeafNode> = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Map' },
        TOO_LONG: { type: 'leaf', code: issueCodes.TOO_LONG },
        TOO_SHORT: { type: 'leaf', code: issueCodes.TOO_SHORT },
    } as const;

    constructor(...element: [ElementKeySchemaType, ElementValueSchemaType]) {
        super();

        this._element = element;
    }
    protected _clone(): MapSchema<ElementKeySchemaType, ElementValueSchemaType> {
        const cloned = new MapSchema(...this._element);
        cloned._minSize = this._minSize;
        cloned._maxSize = this._maxSize;

        return cloned;
    }
    _parse(value: unknown): InternalParseResult<Infer<Map<ElementKeySchemaType, ElementValueSchemaType>>> {
        if (!(value instanceof Map)) {
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

        const [elementKeySchema, elementValueSchema] = this._element;

        let issue: TreeNode | undefined = undefined;
        let i = 0;
        for (const [childKey, childValue] of value) {
            let childIssue: TreeNode | undefined = undefined;

            let issueOrSuccess = elementKeySchema._parse(childKey);
            if (issueOrSuccess !== undefined && isIssue(issueOrSuccess)) {
                childIssue = addIssue(childIssue, { type: 'nest', key: 0, child: issueOrSuccess });
            }

            issueOrSuccess = elementValueSchema._parse(childValue);
            if (issueOrSuccess !== undefined && isIssue(issueOrSuccess)) {
                childIssue = addIssue(childIssue, { type: 'nest', key: 1, child: issueOrSuccess });
            }

            if (childIssue !== undefined) {
                issue = addIssue(issue, { type: 'nest', key: i, child: childIssue });
            }

            i++;
        }

        if (issue) {
            return issue;
        }

        return undefined;
    }
    min(size: number): MapSchema<ElementKeySchemaType, ElementValueSchemaType> {
        const cloned = this._clone();
        cloned._minSize = size;

        return cloned;
    }
    max(size: number): MapSchema<ElementKeySchemaType, ElementValueSchemaType> {
        const cloned = this._clone();
        cloned._maxSize = size;

        return cloned;
    }
    size(size: number): MapSchema<ElementKeySchemaType, ElementValueSchemaType> {
        const cloned = this._clone();
        cloned._minSize = size;
        cloned._maxSize = size;

        return cloned;
    }
}

const map = /* @__PURE__ */ <ElementKeySchemaType extends AnySchemaType, ElementValueSchemaType extends AnySchemaType>(
    ...args: ConstructorParameters<typeof MapSchema<ElementKeySchemaType, ElementValueSchemaType>>
): MapSchema<ElementKeySchemaType, ElementValueSchemaType> => new MapSchema(...args);

export { map };
