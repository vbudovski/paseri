import type { Infer } from '../infer.ts';
import { type TreeNode, addIssue } from '../issue.ts';
import { type InternalParseResult, isIssue } from '../result.ts';
import { Schema } from './schema.ts';

// biome-ignore lint/suspicious/noExplicitAny: Required to accept any Schema variant.
type ValidTupleSchemaType<T = any> = [Schema<T>, ...Schema<T>[]];

class TupleSchema<TupleSchemaType extends ValidTupleSchemaType> extends Schema<Infer<TupleSchemaType>> {
    private readonly _schemas: TupleSchemaType;
    private readonly _length: number;

    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
        TOO_LONG: { type: 'leaf', code: 'too_long' },
        TOO_SHORT: { type: 'leaf', code: 'too_short' },
    } as const;

    constructor(...schemas: TupleSchemaType) {
        super();

        this._schemas = schemas;
        this._length = schemas.length;
    }
    _parse(value: unknown): InternalParseResult<Infer<TupleSchemaType>> {
        if (!Array.isArray(value)) {
            return this.issues.INVALID_TYPE;
        }

        const length = value.length;

        if (length > this._length) {
            return this.issues.TOO_LONG;
        }

        if (length < this._length) {
            return this.issues.TOO_SHORT;
        }

        let issue: TreeNode | undefined = undefined;
        for (let i = 0; i < length; i++) {
            const schema = this._schemas[i];
            const elementValue = value[i];
            const issueOrSuccess = schema._parse(elementValue);
            if (issueOrSuccess !== undefined && isIssue(issueOrSuccess)) {
                issue = addIssue(issue, { type: 'nest', key: i, child: issueOrSuccess });
            }
        }

        if (issue) {
            return issue;
        }

        return undefined;
    }
}

function tuple<TupleSchemaType extends ValidTupleSchemaType>(
    ...args: ConstructorParameters<typeof TupleSchema<TupleSchemaType>>
) {
    return new TupleSchema(...args);
}

export { tuple };
