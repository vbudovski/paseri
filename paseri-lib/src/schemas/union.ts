import type { TupleToUnion } from 'type-fest';
import type { Infer } from '../infer.ts';
import { type InternalParseResult, isParseSuccess } from '../result.ts';
import { type AnySchemaType, Schema } from './schema.ts';

type ValidTupleType = [AnySchemaType, AnySchemaType, ...AnySchemaType[]];

class UnionSchema<TupleType extends ValidTupleType> extends Schema<Infer<TupleToUnion<TupleType>>> {
    private readonly _elements: TupleType;

    readonly issues = {
        INVALID_VALUE: { type: 'leaf', code: 'invalid_value' },
    } as const;

    constructor(...elements: TupleType) {
        super();

        this._elements = elements;
    }
    protected _clone() {
        return new UnionSchema(...this._elements);
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
