import { issueCodes, type LeafNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { primitiveToString } from '../utils.ts';
import { Schema } from './schema.ts';

type LiteralType = string | number | bigint | boolean;

type HomogeneousLiteralArray =
    | readonly [string, ...string[]]
    | readonly [number, ...number[]]
    | readonly [bigint, ...bigint[]]
    | readonly [boolean, ...boolean[]];

class EnumSchema<const T extends readonly LiteralType[]> extends Schema<T[number]> {
    private readonly _values: T;
    private readonly _set: Set<T[number]>;

    private readonly issues;

    constructor(...values: T) {
        super();

        if (values.length === 0) {
            throw new Error('Enum must contain at least one value.');
        }

        this._values = Object.freeze([...values]) as unknown as T;
        this._set = new Set(values);
        this.issues = {
            INVALID_ENUM_VALUE: {
                type: 'leaf',
                code: issueCodes.INVALID_ENUM_VALUE,
                expected: this._values.map(primitiveToString),
            },
        } as const satisfies Record<string, LeafNode>;
    }
    protected _clone(): EnumSchema<T> {
        return new EnumSchema(...this._values);
    }
    _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<T[number]> {
        if (this._set.has(value as T[number])) {
            return undefined;
        }
        return this.issues.INVALID_ENUM_VALUE;
    }
    extract<const U extends readonly T[number][]>(...values: U): EnumSchema<U> {
        return new EnumSchema(...values);
    }
    exclude<const U extends readonly T[number][]>(...values: U): EnumSchema<readonly Exclude<T[number], U[number]>[]> {
        const excluded = new Set<T[number]>(values);
        const remaining = this._values.filter((value) => !excluded.has(value)) as unknown as readonly Exclude<
            T[number],
            U[number]
        >[];
        return new EnumSchema(...remaining);
    }
}

/**
 * [Enum](https://paseri.dev/reference/schema/others/enum/) schema.
 */
const enum_ = /* @__PURE__ */ <const T extends HomogeneousLiteralArray>(...values: T): EnumSchema<T> =>
    new EnumSchema(...values);

export { EnumSchema, enum_ };
