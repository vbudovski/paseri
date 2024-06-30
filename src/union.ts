import type { TupleToUnion } from 'type-fest';
import { type Infer, type InternalParseResult, Schema, isParseSuccess } from './schema.ts';

// biome-ignore lint/suspicious/noExplicitAny: Required to accept any Schema variant.
type ValidTupleType<T = any> = [Schema<T>, Schema<T>, ...Schema<T>[]];

class UnionSchema<TupleType extends ValidTupleType> extends Schema<Infer<TupleToUnion<TupleType>>> {
    private readonly _elements: TupleType;

    readonly issues = {
        INVALID_VALUE: { type: 'leaf', code: 'invalid_value' },
    } as const;

    constructor(...elements: TupleType) {
        super();

        this._elements = elements;
    }
    _parse(value: unknown): InternalParseResult<Infer<TupleToUnion<TupleType>>> {
        for (let i = 0; i < this._elements.length; i++) {
            const schema = this._elements[i];
            const result = schema._parse(value);
            if (result === undefined) {
                return undefined;
            }
            if (isParseSuccess<Infer<TupleToUnion<TupleType>>>(result)) {
                return result;
            }
        }

        return this.issues.INVALID_VALUE;
    }
}

function union<TupleType extends ValidTupleType>(...args: ConstructorParameters<typeof UnionSchema<TupleType>>) {
    return new UnionSchema(...args);
}

export { union };
