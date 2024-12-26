import type { TupleToUnion } from 'type-fest';
import type { Infer } from '../infer.ts';
import { type TreeNode, addIssue } from '../issue.ts';
import { type InternalParseResult, isParseSuccess } from '../result.ts';
import { type AnySchemaType, Schema } from './schema.ts';

type ValidTupleType = [AnySchemaType, AnySchemaType, ...AnySchemaType[]];

class UnionSchema<TupleType extends ValidTupleType> extends Schema<Infer<TupleToUnion<TupleType>>> {
    private readonly _elements: TupleType;

    constructor(...elements: TupleType) {
        super();

        this._elements = elements;
    }
    protected _clone(): UnionSchema<TupleType> {
        return new UnionSchema(...this._elements);
    }
    _parse(value: unknown): InternalParseResult<Infer<TupleToUnion<TupleType>>> {
        let issue: TreeNode | undefined = undefined;
        for (let i = 0; i < this._elements.length; i++) {
            const schema = this._elements[i];
            const issueOrSuccess = schema._parse(value);
            if (issueOrSuccess === undefined) {
                return undefined;
            }
            if (isParseSuccess(issueOrSuccess)) {
                return issueOrSuccess as InternalParseResult<Infer<TupleToUnion<TupleType>>>;
            }

            issue = addIssue(issue, issueOrSuccess);
        }

        return issue;
    }
}

const union = /* @__PURE__ */ <TupleType extends ValidTupleType>(
    ...args: ConstructorParameters<typeof UnionSchema<TupleType>>
): UnionSchema<TupleType> => new UnionSchema(...args);

export { union };
