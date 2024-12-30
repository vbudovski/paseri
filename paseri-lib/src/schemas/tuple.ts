import type { Infer } from '../infer.ts';
import { type LeafNode, type TreeNode, addIssue, issueCodes } from '../issue.ts';
import { type InternalParseResult, isIssue } from '../result.ts';
import { type AnySchemaType, Schema } from './schema.ts';

type ValidTupleSchemaType = [AnySchemaType, ...AnySchemaType[]];

class TupleSchema<TupleSchemaType extends ValidTupleSchemaType> extends Schema<Infer<TupleSchemaType>> {
    private readonly _schemas: TupleSchemaType;
    private readonly _length: number;

    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'array' },
        TOO_LONG: { type: 'leaf', code: issueCodes.TOO_LONG },
        TOO_SHORT: { type: 'leaf', code: issueCodes.TOO_SHORT },
    } as const satisfies Record<string, LeafNode>;

    constructor(...schemas: TupleSchemaType) {
        super();

        this._schemas = schemas;
        this._length = schemas.length;
    }
    protected _clone(): TupleSchema<TupleSchemaType> {
        return new TupleSchema(...this._schemas);
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

const tuple = /* @__PURE__ */ <TupleSchemaType extends ValidTupleSchemaType>(
    ...args: ConstructorParameters<typeof TupleSchema<TupleSchemaType>>
): TupleSchema<TupleSchemaType> => new TupleSchema(...args);

export { tuple };
