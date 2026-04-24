import { TAG_MAX_SIZE, TAG_MIN_SIZE } from '../checks/tags.ts';
import type { Infer } from '../infer.ts';
import { addIssue, issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import { type InternalParseResult, isParseSuccess } from '../result.ts';
import type { AnySchemaType, Check } from './schema.ts';
import { Schema } from './schema.ts';

class SetSchema<ElementSchemaType extends AnySchemaType> extends Schema<Infer<Set<ElementSchemaType>>> {
    private readonly _element: ElementSchemaType;
    private readonly _checks: readonly Check[] | undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Set' },
    } as const satisfies Record<string, LeafNode>;

    constructor(element: ElementSchemaType, checks?: readonly Check[]) {
        super();

        this._element = element;
        this._checks = checks;
    }
    protected _clone(): SetSchema<ElementSchemaType> {
        return new SetSchema(this._element, this._checks);
    }
    _parse(value: unknown): InternalParseResult<Infer<Set<ElementSchemaType>>> {
        if (!(value instanceof Set)) {
            return this.issues.INVALID_TYPE;
        }

        const schema = this._element;

        let issue: TreeNode | undefined;
        let newSet: Set<unknown> | undefined;
        let i = 0;
        for (const childValue of value) {
            const issueOrSuccess = schema._parse(childValue);
            if (issueOrSuccess === undefined) {
                newSet?.add(childValue);
            } else if (isParseSuccess(issueOrSuccess)) {
                if (!newSet) {
                    newSet = new Set<unknown>();
                    let j = 0;
                    for (const prev of value) {
                        if (j >= i) break;
                        newSet.add(prev);
                        j++;
                    }
                }
                newSet.add(issueOrSuccess.value);
            } else {
                newSet?.add(childValue);
                issue = addIssue(issue, { type: 'nest', key: i, child: issueOrSuccess });
            }
            i++;
        }

        if (issue) {
            return issue;
        }

        if (this._checks !== undefined) {
            const checkTarget = newSet ?? value;
            const checks = this._checks;
            for (let i = 0; i < checks.length; i++) {
                const check = checks[i];
                switch (check.tag) {
                    case TAG_MIN_SIZE:
                        if (checkTarget.size < check.param) {
                            return check.issue;
                        }
                        break;
                    case TAG_MAX_SIZE:
                        if (checkTarget.size > check.param) {
                            return check.issue;
                        }
                        break;
                }
            }
        }

        if (newSet) {
            return { ok: true, value: newSet as Infer<Set<ElementSchemaType>> };
        }

        return undefined;
    }
}

/**
 * [Set](https://paseri.dev/reference/schema/collections/set/) schema.
 */
const set =
    /* @__PURE__ */
        <ElementSchemaType extends AnySchemaType>(element: ElementSchemaType) =>
        (...checks: Check[]): SetSchema<ElementSchemaType> =>
            checks.length === 0 ? new SetSchema(element) : new SetSchema(element, checks);

export { set };
