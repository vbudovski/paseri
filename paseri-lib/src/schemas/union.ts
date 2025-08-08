import type { TupleToUnion } from 'type-fest';
import type { Infer } from '../infer.ts';
import { addIssue, issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { isParseSuccess } from '../result.ts';
import { isPlainObject, primitiveToString } from '../utils.ts';
import { LiteralSchema } from './literal.ts';
import { ObjectSchema } from './object.ts';
import { type AnySchemaType, Schema } from './schema.ts';

type ValidTupleType = [AnySchemaType, AnySchemaType, ...AnySchemaType[]];

interface WithoutDiscriminatorResult {
    found: false;
}

interface WithDiscriminatorResult {
    found: true;
    key: string;
    schemas: Map<unknown, AnySchemaType>;
    options: string[];
}

type DiscriminatorResult = WithDiscriminatorResult | WithoutDiscriminatorResult;

function findDiscriminator<TupleType extends ValidTupleType>(...elements: TupleType): DiscriminatorResult {
    if (!elements.every((element) => element instanceof ObjectSchema)) {
        return { found: false };
    }

    const counts: Record<string, number> = {};
    for (const element of elements) {
        for (const [key, schema] of Object.entries(element.shape)) {
            if (schema instanceof LiteralSchema) {
                counts[key] = counts[key] === undefined ? 1 : counts[key] + 1;
            }
        }
    }
    const key = Object.entries(counts)
        .filter(([, count]) => count === elements.length)
        .map(([key]) => key)
        .shift();
    if (!key) {
        return { found: false };
    }

    const schemas = new Map<unknown, AnySchemaType>();
    const options: string[] = [];
    for (const element of elements) {
        const value = (element.shape[key] as LiteralSchema<never>).value;

        schemas.set(value, element);
        options.push(primitiveToString(value));
    }

    return { found: true, key, schemas, options };
}

class UnionSchema<TupleType extends ValidTupleType> extends Schema<Infer<TupleToUnion<TupleType>>> {
    private readonly _elements: TupleType;
    private readonly _discriminator: DiscriminatorResult;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'object' },
        INVALID_DISCRIMINATOR_VALUE: {
            type: 'leaf',
            code: issueCodes.INVALID_DISCRIMINATOR_VALUE,
            expected: [] as string[],
        },
    } satisfies Record<string, LeafNode>;

    constructor(...elements: TupleType) {
        super();

        this._elements = elements;
        this._discriminator = findDiscriminator(...this._elements);
        if (this._discriminator.found) {
            this.issues.INVALID_DISCRIMINATOR_VALUE.expected = this._discriminator.options;
        }
    }
    protected _clone(): UnionSchema<TupleType> {
        return new UnionSchema(...this._elements);
    }
    _parseDiscriminated(value: unknown): InternalParseResult<Infer<TupleToUnion<TupleType>>> {
        if (!isPlainObject(value)) {
            return this.issues.INVALID_TYPE;
        }

        const discriminator = this._discriminator as WithDiscriminatorResult;
        const schema = discriminator.schemas.get(value[discriminator.key]);
        if (schema) {
            return schema._parse(value) as InternalParseResult<Infer<TupleToUnion<TupleType>>>;
        }

        return this.issues.INVALID_DISCRIMINATOR_VALUE;
    }
    _parseRegular(value: unknown): InternalParseResult<Infer<TupleToUnion<TupleType>>> {
        let issue: TreeNode | undefined;
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
    _parse(value: unknown): InternalParseResult<Infer<TupleToUnion<TupleType>>> {
        if (this._discriminator.found) {
            return this._parseDiscriminated(value);
        }

        return this._parseRegular(value);
    }
}

/**
 * [Union](https://paseri.dev/reference/schema/others/union/) schema.
 */
const union = /* @__PURE__ */ <TupleType extends ValidTupleType>(
    ...args: ConstructorParameters<typeof UnionSchema<TupleType>>
): UnionSchema<TupleType> => new UnionSchema(...args);

export { union, findDiscriminator };
