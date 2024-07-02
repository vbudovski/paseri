import type { Infer } from '../infer.ts';
import { type TreeNode, addIssue } from '../issue.ts';
import { type InternalParseResult, isIssue } from '../result.ts';
import { isPlainObject } from '../utils.ts';
import { Schema } from './schema.ts';

// biome-ignore lint/suspicious/noExplicitAny: Required to accept any Schema variant.
type ValidElementSchemaType = Schema<any>;

class RecordSchema<ElementSchemaType extends ValidElementSchemaType> extends Schema<
    Infer<Record<string, ElementSchemaType>>
> {
    private readonly _element: ElementSchemaType;

    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
    } as const;

    constructor(element: ElementSchemaType) {
        super();

        this._element = element;
    }
    _parse(value: unknown): InternalParseResult<Infer<Record<string, ElementSchemaType>>> {
        if (!isPlainObject(value)) {
            return this.issues.INVALID_TYPE;
        }

        const schema = this._element;

        let issue: TreeNode | undefined = undefined;
        for (const key in value) {
            const childValue = value[key];
            const issueOrSuccess = schema._parse(childValue);
            if (issueOrSuccess !== undefined && isIssue(issueOrSuccess)) {
                issue = addIssue(issue, { type: 'nest', key, child: issueOrSuccess });
            }
        }

        if (issue) {
            return issue;
        }

        return undefined;
    }
}

function record<ElementSchemaType extends ValidElementSchemaType>(
    ...args: ConstructorParameters<typeof RecordSchema<ElementSchemaType>>
) {
    return new RecordSchema(...args);
}

export { record };
