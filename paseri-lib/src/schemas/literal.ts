import type { IsLiteral } from 'type-fest';
import { type LeafNode, issueCodes } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

type LiteralType = string | number | bigint | boolean | symbol;

class LiteralSchema<OutputType extends LiteralType> extends Schema<OutputType> {
    private readonly _value: OutputType;

    readonly issues: Record<string, LeafNode> = {} as const;

    constructor(value: IsLiteral<OutputType> extends true ? OutputType : never) {
        super();

        this._value = value;

        this.issues.INVALID_VALUE = {
            type: 'leaf',
            code: issueCodes.INVALID_VALUE,
            expected: typeof value === 'bigint' ? `${value}n` : String(value),
        };
    }
    protected _clone(): LiteralSchema<OutputType> {
        return new LiteralSchema(this._value as IsLiteral<OutputType> extends true ? OutputType : never);
    }
    _parse(value: unknown): InternalParseResult<OutputType> {
        if (value !== this._value) {
            return this.issues.INVALID_VALUE;
        }

        return undefined;
    }
}

const literal = /* @__PURE__ */ <OutputType extends LiteralType>(
    ...args: ConstructorParameters<typeof LiteralSchema<OutputType>>
): LiteralSchema<OutputType> => new LiteralSchema(...args);

export { literal };
