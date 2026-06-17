import type { Primitive, TupleToUnion } from 'type-fest';
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

interface LiteralSetResult {
    values: Set<unknown>;
    options: string[];
}

function findLiteralSet<TupleType extends ValidTupleType>(...elements: TupleType): LiteralSetResult | undefined {
    if (!elements.every((element) => element instanceof LiteralSchema)) {
        return undefined;
    }

    const values = new Set<unknown>();
    const options: string[] = [];
    for (const element of elements) {
        const value = (element as LiteralSchema<never>).value;
        values.add(value);
        options.push(primitiveToString(value));
    }

    return { values, options };
}

function findDiscriminator<TupleType extends ValidTupleType>(...elements: TupleType): DiscriminatorResult {
    if (!elements.every((element) => element instanceof ObjectSchema)) {
        return { found: false };
    }

    // Null prototype: keys come from user shapes, so __proto__/constructor must behave as plain keys.
    const counts: Record<string, number> = Object.create(null);
    for (const element of elements) {
        for (const [key, schema] of Object.entries(element.shape)) {
            if (schema instanceof LiteralSchema) {
                counts[key] = counts[key] === undefined ? 1 : counts[key] + 1;
            }
        }
    }
    const candidateKeys = Object.entries(counts)
        .filter(([, count]) => count === elements.length)
        .map(([key]) => key);

    // Try each candidate key in turn: the first whose values are all distinct discriminates. Only when
    // every candidate collides was a discriminator clearly intended but unusable, so fail loudly.
    let duplicate: { readonly key: string; readonly value: Primitive } | undefined;
    for (const key of candidateKeys) {
        const schemas = new Map<unknown, AnySchemaType>();
        const options: string[] = [];
        let collided = false;
        for (const element of elements) {
            const value = (element.shape[key] as LiteralSchema<never>).value;

            if (schemas.has(value)) {
                collided = true;
                if (duplicate === undefined) {
                    duplicate = { key, value };
                }
                break;
            }

            schemas.set(value, element);
            options.push(primitiveToString(value));
        }
        if (!collided) {
            return { found: true, key, schemas, options };
        }
    }

    if (duplicate !== undefined) {
        throw new Error(
            `Duplicate discriminator value ${primitiveToString(duplicate.value)} for key '${duplicate.key}'.`,
        );
    }

    return { found: false };
}

// Dispatch discriminant resolved once at construction. A numeric tag keeps `_parse`'s read monomorphic and lets
// the regular path branch on a single field load instead of probing `_discriminator` then `_literalValues`.
const STRATEGY_REGULAR = 0;
const STRATEGY_DISCRIMINATED = 1;
const STRATEGY_LITERAL_SET = 2;

class UnionSchema<TupleType extends ValidTupleType> extends Schema<Infer<TupleToUnion<TupleType>>> {
    private readonly _elements: TupleType;
    private readonly _discriminator: DiscriminatorResult;
    private readonly _literalValues: Set<unknown> | undefined;
    private readonly _strategy: number;

    private readonly issues;

    constructor(...elements: TupleType) {
        super();

        if (elements.length < 2) {
            throw new Error('Union must contain at least two members.');
        }

        this._elements = elements;
        this._discriminator = findDiscriminator(...this._elements);
        // Discriminators require object members, so an all-literal union never has one — probe only when absent.
        const literalSet = this._discriminator.found ? undefined : findLiteralSet(...this._elements);
        this._literalValues = literalSet?.values;
        let strategy = STRATEGY_REGULAR;
        if (this._discriminator.found) {
            strategy = STRATEGY_DISCRIMINATED;
        } else if (literalSet !== undefined) {
            strategy = STRATEGY_LITERAL_SET;
        }
        this._strategy = strategy;
        this.issues = {
            INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'object' },
            INVALID_DISCRIMINATOR_VALUE: {
                type: 'leaf',
                code: issueCodes.INVALID_DISCRIMINATOR_VALUE,
                expected: this._discriminator.found ? this._discriminator.options : [],
            },
            INVALID_ENUM_VALUE: {
                type: 'leaf',
                code: issueCodes.INVALID_ENUM_VALUE,
                expected: literalSet ? literalSet.options : [],
            },
        } as const satisfies Record<string, LeafNode>;
    }
    protected _clone(): UnionSchema<TupleType> {
        return new UnionSchema(...this._elements);
    }
    _parseDiscriminated(
        value: unknown,
        _depth: number,
        _maxDepth: number,
    ): InternalParseResult<Infer<TupleToUnion<TupleType>>> {
        if (!isPlainObject(value)) {
            return this.issues.INVALID_TYPE;
        }

        const discriminator = this._discriminator as WithDiscriminatorResult;
        const schema = discriminator.schemas.get(value[discriminator.key]);
        if (schema) {
            return schema._parse(value, _depth, _maxDepth) as InternalParseResult<Infer<TupleToUnion<TupleType>>>;
        }

        return this.issues.INVALID_DISCRIMINATOR_VALUE;
    }
    _parseLiteralSet(value: unknown): InternalParseResult<Infer<TupleToUnion<TupleType>>> {
        if ((this._literalValues as Set<unknown>).has(value)) {
            return undefined;
        }

        return this.issues.INVALID_ENUM_VALUE;
    }
    _parseRegular(
        value: unknown,
        _depth: number,
        _maxDepth: number,
    ): InternalParseResult<Infer<TupleToUnion<TupleType>>> {
        let issue: TreeNode | undefined;
        for (let i = 0; i < this._elements.length; i++) {
            const schema = this._elements[i];
            const issueOrSuccess = schema._parse(value, _depth, _maxDepth);
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
    _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<Infer<TupleToUnion<TupleType>>> {
        const strategy = this._strategy;
        if (strategy === STRATEGY_REGULAR) {
            return this._parseRegular(value, _depth, _maxDepth);
        }
        if (strategy === STRATEGY_DISCRIMINATED) {
            return this._parseDiscriminated(value, _depth, _maxDepth);
        }

        return this._parseLiteralSet(value);
    }
}

/**
 * [Union](https://paseri.dev/reference/schema/others/union/) schema.
 */
const union = /* @__PURE__ */ <TupleType extends ValidTupleType>(
    ...args: ConstructorParameters<typeof UnionSchema<TupleType>>
): UnionSchema<TupleType> => new UnionSchema(...args);

export { findDiscriminator, UnionSchema, union };
