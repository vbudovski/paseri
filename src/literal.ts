import type { IsLiteral } from 'type-fest';
import { type ParseResult, Schema } from './schema.ts';

type LiteralType = string | number | bigint | boolean | symbol;

class LiteralSchema<OutputType extends LiteralType> extends Schema<OutputType> {
    private readonly _value: LiteralType;

    readonly issues = {
        INVALID_VALUE: { type: 'leaf', code: 'invalid_value' },
    } as const;

    constructor(value: IsLiteral<OutputType> extends true ? OutputType : never) {
        super();

        this._value = value;
    }
    _parse(value: unknown): ParseResult<OutputType> {
        if (value !== this._value) {
            return { ok: false, issue: this.issues.INVALID_VALUE };
        }

        return { ok: true, value: value as OutputType };
    }
}

function literal<OutputType extends LiteralType>(...args: ConstructorParameters<typeof LiteralSchema<OutputType>>) {
    return new LiteralSchema(...args);
}

export { literal };
