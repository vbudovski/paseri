import type { Infer } from '../infer.ts';
import { addIssue, issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import { type InternalParseResult, isParseSuccess } from '../result.ts';
import { isPlainObject } from '../utils.ts';
import { type AnySchemaType, Schema } from './schema.ts';

class RecordSchema<ElementSchemaType extends AnySchemaType> extends Schema<
    Infer<Record<PropertyKey, ElementSchemaType>>
> {
    private readonly _element: ElementSchemaType;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Record' },
    } as const satisfies Record<string, LeafNode>;

    constructor(element: ElementSchemaType) {
        super();

        this._element = element;
    }
    protected _clone(): RecordSchema<ElementSchemaType> {
        return new RecordSchema(this._element);
    }
    _parse(value: unknown): InternalParseResult<Infer<Record<PropertyKey, ElementSchemaType>>> {
        if (!isPlainObject(value)) {
            return this.issues.INVALID_TYPE;
        }

        const schema = this._element;

        let issue: TreeNode | undefined;
        let modifiedValues: Record<PropertyKey, unknown> | undefined;
        for (const key in value) {
            const childValue = value[key];
            const issueOrSuccess = schema._parse(childValue);
            if (issueOrSuccess === undefined) {
                continue;
            }

            if (isParseSuccess(issueOrSuccess)) {
                if (!modifiedValues) {
                    modifiedValues = {};
                }
                modifiedValues[key] = issueOrSuccess.value;
            } else {
                issue = addIssue(issue, { type: 'nest', key, child: issueOrSuccess });
            }
        }

        if (issue) {
            return issue;
        }

        if (modifiedValues) {
            return {
                ok: true,
                value: { ...value, ...modifiedValues } as Infer<Record<PropertyKey, ElementSchemaType>>,
            };
        }

        return undefined;
    }
}

/**
 * [Record](https://paseri.dev/reference/schema/collections/record/) schema.
 */
const record =
    /* @__PURE__ */
        <ElementSchemaType extends AnySchemaType>(element: ElementSchemaType) =>
        (): RecordSchema<ElementSchemaType> =>
            new RecordSchema(element);

export { record };
