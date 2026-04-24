import { TAG_MAX_SIZE, TAG_MIN_SIZE } from '../checks/tags.ts';
import type { Infer } from '../infer.ts';
import { addIssue, issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import { type InternalParseResult, isParseSuccess } from '../result.ts';
import type { AnySchemaType, Check } from './schema.ts';
import { Schema } from './schema.ts';

class MapSchema<
    ElementKeySchemaType extends AnySchemaType,
    ElementValueSchemaType extends AnySchemaType,
> extends Schema<Infer<Map<ElementKeySchemaType, ElementValueSchemaType>>> {
    private readonly _element: [ElementKeySchemaType, ElementValueSchemaType];
    private readonly _checks: readonly Check[] | undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Map' },
    } as const satisfies Record<string, LeafNode>;

    constructor(element: [ElementKeySchemaType, ElementValueSchemaType], checks?: readonly Check[]) {
        super();

        this._element = element;
        this._checks = checks;
    }
    protected _clone(): MapSchema<ElementKeySchemaType, ElementValueSchemaType> {
        return new MapSchema(this._element, this._checks);
    }
    _parse(value: unknown): InternalParseResult<Infer<Map<ElementKeySchemaType, ElementValueSchemaType>>> {
        if (!(value instanceof Map)) {
            return this.issues.INVALID_TYPE;
        }

        const [elementKeySchema, elementValueSchema] = this._element;

        let issue: TreeNode | undefined;
        let newMap: Map<unknown, unknown> | undefined;
        let i = 0;
        for (const [childKey, childValue] of value) {
            let childIssue: TreeNode | undefined;
            let modifiedKey: unknown = childKey;
            let modifiedValue: unknown = childValue;
            let entryModified = false;

            let issueOrSuccess = elementKeySchema._parse(childKey);
            if (issueOrSuccess === undefined) {
                // Key unmodified.
            } else if (isParseSuccess(issueOrSuccess)) {
                entryModified = true;
                modifiedKey = issueOrSuccess.value;
            } else {
                childIssue = addIssue(childIssue, { type: 'nest', key: 0, child: issueOrSuccess });
            }

            issueOrSuccess = elementValueSchema._parse(childValue);
            if (issueOrSuccess === undefined) {
                // Value unmodified.
            } else if (isParseSuccess(issueOrSuccess)) {
                entryModified = true;
                modifiedValue = issueOrSuccess.value;
            } else {
                childIssue = addIssue(childIssue, { type: 'nest', key: 1, child: issueOrSuccess });
            }

            if (childIssue !== undefined) {
                newMap?.set(childKey, childValue);
                issue = addIssue(issue, { type: 'nest', key: i, child: childIssue });
            } else if (entryModified) {
                if (!newMap) {
                    newMap = new Map<unknown, unknown>();
                    let j = 0;
                    for (const [prevKey, prevValue] of value) {
                        if (j >= i) break;
                        newMap.set(prevKey, prevValue);
                        j++;
                    }
                }
                newMap.set(modifiedKey, modifiedValue);
            } else {
                newMap?.set(childKey, childValue);
            }

            i++;
        }

        if (issue) {
            return issue;
        }

        if (this._checks !== undefined) {
            const checkTarget = newMap ?? value;
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

        if (newMap) {
            return { ok: true, value: newMap as Infer<Map<ElementKeySchemaType, ElementValueSchemaType>> };
        }

        return undefined;
    }
}

/**
 * [Map](https://paseri.dev/reference/schema/collections/map/) schema.
 */
const map =
    /* @__PURE__ */
        <ElementKeySchemaType extends AnySchemaType, ElementValueSchemaType extends AnySchemaType>(
            keySchema: ElementKeySchemaType,
            valueSchema: ElementValueSchemaType,
        ) =>
        (...checks: Check[]): MapSchema<ElementKeySchemaType, ElementValueSchemaType> =>
            checks.length === 0
                ? new MapSchema([keySchema, valueSchema])
                : new MapSchema([keySchema, valueSchema], checks);

export { map };
