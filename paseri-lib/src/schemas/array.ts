import { TAG_MAX_LENGTH, TAG_MIN_LENGTH } from '../checks/tags.ts';
import type { Infer } from '../infer.ts';
import { addIssue, issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import { type InternalParseResult, isParseSuccess } from '../result.ts';
import type { Check } from './schema.ts';
import { type AnySchemaType, Schema } from './schema.ts';

class ArraySchema<ElementSchemaType extends AnySchemaType> extends Schema<Infer<ElementSchemaType[]>> {
    private readonly _element: ElementSchemaType;
    private readonly _checks: readonly Check[] | undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'array' },
    } as const satisfies Record<string, LeafNode>;

    constructor(element: ElementSchemaType, checks?: readonly Check[]) {
        super();

        this._element = element;
        this._checks = checks;
    }
    protected _clone(): ArraySchema<ElementSchemaType> {
        return new ArraySchema(this._element, this._checks);
    }
    _parse(value: unknown): InternalParseResult<Infer<ElementSchemaType[]>> {
        if (!Array.isArray(value)) {
            return this.issues.INVALID_TYPE;
        }

        if (this._checks !== undefined) {
            const checks = this._checks;
            for (let i = 0; i < checks.length; i++) {
                const check = checks[i];
                switch (check.tag) {
                    case TAG_MIN_LENGTH:
                        if (value.length < check.param) {
                            return check.issue;
                        }
                        break;
                    case TAG_MAX_LENGTH:
                        if (value.length > check.param) {
                            return check.issue;
                        }
                        break;
                }
            }
        }

        const length = value.length;
        const schema = this._element;

        let issue: TreeNode | undefined;
        let newArray: unknown[] | undefined;
        for (let i = 0; i < length; i++) {
            const childValue = value[i];
            const issueOrSuccess = schema._parse(childValue);
            if (issueOrSuccess === undefined) {
                newArray?.push(childValue);
                continue;
            }

            if (isParseSuccess(issueOrSuccess)) {
                if (!newArray) {
                    newArray = value.slice(0, i);
                }
                newArray.push(issueOrSuccess.value);
            } else {
                newArray?.push(childValue);
                issue = addIssue(issue, { type: 'nest', key: i, child: issueOrSuccess });
            }
        }

        if (issue) {
            return issue;
        }

        if (newArray) {
            return { ok: true, value: newArray as Infer<ElementSchemaType[]> };
        }

        return undefined;
    }
}

/**
 * [Array](https://paseri.dev/reference/schema/collections/array/) schema.
 */
const array =
    /* @__PURE__ */
        <ElementSchemaType extends AnySchemaType>(element: ElementSchemaType) =>
        (...checks: Check[]): ArraySchema<ElementSchemaType> =>
            checks.length === 0 ? new ArraySchema(element) : new ArraySchema(element, checks);

export { array };
