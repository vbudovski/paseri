import type { IsLiteral } from 'type-fest';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

type LiteralType = string | number | bigint | boolean | symbol;

class LiteralSchema<OutputType extends LiteralType> extends Schema<OutputType> {
    private readonly _value: OutputType;

    readonly issues = {
        INVALID_VALUE: { type: 'leaf', code: 'invalid_value' },
    } as const;

    constructor(value: IsLiteral<OutputType> extends true ? OutputType : never) {
        super();

        this._value = value;
    }
    protected _clone() {
        return new LiteralSchema(this._value as IsLiteral<OutputType> extends true ? OutputType : never);
    }
    _parse(value: unknown): InternalParseResult<OutputType> {
        if (value !== this._value) {
            return this.issues.INVALID_VALUE;
        }

        return undefined;
    }
}

function literal<OutputType extends LiteralType>(...args: ConstructorParameters<typeof LiteralSchema<OutputType>>) {
    return new LiteralSchema(...args);
}

export { literal };
