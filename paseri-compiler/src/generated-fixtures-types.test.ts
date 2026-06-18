import type { Infer } from '@paseri/paseri';
import * as p from '@paseri/paseri';
import '@paseri/paseri/introspect';
import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import type { safeParseArrayObject } from './generated-fixtures/ArrayObject.gen.ts';
import type { safeParseArrayString } from './generated-fixtures/ArrayString.gen.ts';
import type { safeParseBigint } from './generated-fixtures/Bigint.gen.ts';
import type { safeParseBoolean } from './generated-fixtures/Boolean.gen.ts';
import type { safeParseChain } from './generated-fixtures/Chain.gen.ts';
import type { safeParseDate } from './generated-fixtures/Date.gen.ts';
import type { safeParseDefault } from './generated-fixtures/Default.gen.ts';
import type { safeParseDuration } from './generated-fixtures/Duration.gen.ts';
import type { safeParseEnumNumber } from './generated-fixtures/EnumNumber.gen.ts';
import type { safeParseEnumString } from './generated-fixtures/EnumString.gen.ts';
import type { safeParseInstant } from './generated-fixtures/Instant.gen.ts';
import type { safeParseLazyRecursive } from './generated-fixtures/LazyRecursive.gen.ts';
import type { safeParseLiteralBigint } from './generated-fixtures/LiteralBigint.gen.ts';
import type { safeParseLiteralNumber } from './generated-fixtures/LiteralNumber.gen.ts';
import type { safeParseLiteralString } from './generated-fixtures/LiteralString.gen.ts';
import type { safeParseMap } from './generated-fixtures/Map.gen.ts';
import type { safeParseMapDefaultValue } from './generated-fixtures/MapDefaultValue.gen.ts';
import type { safeParseNever } from './generated-fixtures/Never.gen.ts';
import type { safeParseNull } from './generated-fixtures/Null.gen.ts';
import type { safeParseNullable } from './generated-fixtures/Nullable.gen.ts';
import type { safeParseNumberConstrained } from './generated-fixtures/NumberConstrained.gen.ts';
import type { safeParseObjectDefault } from './generated-fixtures/ObjectDefault.gen.ts';
import type { safeParseObjectNested } from './generated-fixtures/ObjectNested.gen.ts';
import type { safeParseObjectOptional } from './generated-fixtures/ObjectOptional.gen.ts';
import type { safeParseObjectPassthrough } from './generated-fixtures/ObjectPassthrough.gen.ts';
import type { safeParseObjectSimple } from './generated-fixtures/ObjectSimple.gen.ts';
import type { safeParseObjectStrict } from './generated-fixtures/ObjectStrict.gen.ts';
import type { safeParseOptional } from './generated-fixtures/Optional.gen.ts';
import type { safeParsePlainDate } from './generated-fixtures/PlainDate.gen.ts';
import type { safeParsePlainDateTime } from './generated-fixtures/PlainDateTime.gen.ts';
import type { safeParsePlainMonthDay } from './generated-fixtures/PlainMonthDay.gen.ts';
import type { safeParsePlainTime } from './generated-fixtures/PlainTime.gen.ts';
import type { safeParsePlainYearMonth } from './generated-fixtures/PlainYearMonth.gen.ts';
import type { safeParseRecord } from './generated-fixtures/Record.gen.ts';
import type { safeParseRefine } from './generated-fixtures/Refine.gen.ts';
import type { safeParseSet } from './generated-fixtures/Set.gen.ts';
import type { safeParseSetDefault } from './generated-fixtures/SetDefault.gen.ts';
import type { safeParseStringConstrained } from './generated-fixtures/StringConstrained.gen.ts';
import type { safeParseStringPlain } from './generated-fixtures/StringPlain.gen.ts';
import type { safeParseSymbol } from './generated-fixtures/Symbol.gen.ts';
import type { safeParseTuple } from './generated-fixtures/Tuple.gen.ts';
import type { safeParseUndefined } from './generated-fixtures/Undefined.gen.ts';
import type { safeParseUnionLiteral } from './generated-fixtures/UnionLiteral.gen.ts';
import type { safeParseUnionMixed } from './generated-fixtures/UnionMixed.gen.ts';
import type { safeParseUnknown } from './generated-fixtures/Unknown.gen.ts';
import type { safeParseZonedDateTime } from './generated-fixtures/ZonedDateTime.gen.ts';
import { toSource } from './toSource.ts';

// Each generated `safeParse<Name>` must report the same success-value type the runtime's `Infer` gives for its schema.
// Schemas are redeclared here (not imported from matrix.ts) because `isolatedDeclarations` widens an exported schema's
// type to `Schema<unknown>`; the drift guard below pins these to the committed fixtures.

type Node = { value: string; next?: Node | undefined };
const recursive: p.Schema<Node> = p.lazy(() => p.object({ value: p.string(), next: recursive.optional() }));
const temporalBound = Temporal.PlainDate.from('2020-01-01');

const schemas = {
    StringPlain: p.string(),
    StringConstrained: p
        .string()
        .min(1)
        .max(10)
        .regex(/^[a-z]+$/),
    NumberConstrained: p.number().gte(0).lte(100),
    Bigint: p.bigint(),
    Boolean: p.boolean(),
    Symbol: p.symbol(),
    Unknown: p.unknown(),
    Never: p.never(),
    Null: p.null(),
    Undefined: p.undefined(),
    Date: p.date(),
    LiteralString: p.literal('x'),
    LiteralNumber: p.literal(5),
    LiteralBigint: p.literal(5n),
    EnumString: p.enum('a', 'b', 'c'),
    EnumNumber: p.enum(1, 2, 3),
    UnionLiteral: p.union(p.literal('a'), p.literal('b'), p.literal('c')),
    UnionMixed: p.union(p.string(), p.number()),
    ObjectSimple: p.object({ foo: p.string() }),
    ObjectOptional: p.object({ foo: p.string().optional() }),
    ObjectDefault: p.object({ foo: p.string(), count: p.number().optional().default(0) }),
    ObjectStrict: p.object({ foo: p.string() }).strict(),
    ObjectPassthrough: p.object({ foo: p.string() }).passthrough(),
    ObjectNested: p.object({ inner: p.object({ baz: p.number() }) }),
    ArrayString: p.array(p.string()),
    ArrayObject: p.array(p.object({ id: p.number() })),
    Record: p.record(p.number()),
    Map: p.map(p.string(), p.number()),
    MapDefaultValue: p.map(p.string(), p.number().optional().default(0)),
    Set: p.set(p.string()),
    SetDefault: p.set(p.string().optional().default('x')),
    Tuple: p.tuple(p.string(), p.number(), p.literal(123n)),
    Optional: p.string().optional(),
    Nullable: p.number().nullable(),
    Default: p.string().optional().default('x'),
    Refine: p.number().refine((value) => value > 0, { code: 'positive' }),
    Chain: p.string().chain(p.number(), (value) => ({ ok: true, value: Number(value) })),
    LazyRecursive: recursive,
    Instant: p.instant(),
    Duration: p.duration(),
    PlainDate: p.plainDate().min(temporalBound).max(temporalBound),
    PlainDateTime: p.plainDateTime(),
    PlainTime: p.plainTime(),
    PlainYearMonth: p.plainYearMonth(),
    PlainMonthDay: p.plainMonthDay(),
    ZonedDateTime: p.zonedDateTime(),
};

type SchemaName = keyof typeof schemas;
type SchemaFor<Name extends SchemaName> = (typeof schemas)[Name];

// The success arm of a `ParseResult` (`{ ok: true; value: T }`) — extracts `T`, the only thing the type test compares.
type SuccessValue<ResultType> = ResultType extends { ok: true; value: infer ValueType } ? ValueType : never;

// Per fixture: the success-value type its `safeParse<Name>` reports. Keyed to line up with `Inferred`.
type Generated = {
    StringPlain: SuccessValue<ReturnType<typeof safeParseStringPlain>>;
    StringConstrained: SuccessValue<ReturnType<typeof safeParseStringConstrained>>;
    NumberConstrained: SuccessValue<ReturnType<typeof safeParseNumberConstrained>>;
    Bigint: SuccessValue<ReturnType<typeof safeParseBigint>>;
    Boolean: SuccessValue<ReturnType<typeof safeParseBoolean>>;
    Symbol: SuccessValue<ReturnType<typeof safeParseSymbol>>;
    Unknown: SuccessValue<ReturnType<typeof safeParseUnknown>>;
    Never: SuccessValue<ReturnType<typeof safeParseNever>>;
    Null: SuccessValue<ReturnType<typeof safeParseNull>>;
    Undefined: SuccessValue<ReturnType<typeof safeParseUndefined>>;
    Date: SuccessValue<ReturnType<typeof safeParseDate>>;
    LiteralString: SuccessValue<ReturnType<typeof safeParseLiteralString>>;
    LiteralNumber: SuccessValue<ReturnType<typeof safeParseLiteralNumber>>;
    LiteralBigint: SuccessValue<ReturnType<typeof safeParseLiteralBigint>>;
    EnumString: SuccessValue<ReturnType<typeof safeParseEnumString>>;
    EnumNumber: SuccessValue<ReturnType<typeof safeParseEnumNumber>>;
    UnionLiteral: SuccessValue<ReturnType<typeof safeParseUnionLiteral>>;
    UnionMixed: SuccessValue<ReturnType<typeof safeParseUnionMixed>>;
    ObjectSimple: SuccessValue<ReturnType<typeof safeParseObjectSimple>>;
    ObjectOptional: SuccessValue<ReturnType<typeof safeParseObjectOptional>>;
    ObjectDefault: SuccessValue<ReturnType<typeof safeParseObjectDefault>>;
    ObjectStrict: SuccessValue<ReturnType<typeof safeParseObjectStrict>>;
    ObjectPassthrough: SuccessValue<ReturnType<typeof safeParseObjectPassthrough>>;
    ObjectNested: SuccessValue<ReturnType<typeof safeParseObjectNested>>;
    ArrayString: SuccessValue<ReturnType<typeof safeParseArrayString>>;
    ArrayObject: SuccessValue<ReturnType<typeof safeParseArrayObject>>;
    Record: SuccessValue<ReturnType<typeof safeParseRecord>>;
    Map: SuccessValue<ReturnType<typeof safeParseMap>>;
    MapDefaultValue: SuccessValue<ReturnType<typeof safeParseMapDefaultValue>>;
    Set: SuccessValue<ReturnType<typeof safeParseSet>>;
    SetDefault: SuccessValue<ReturnType<typeof safeParseSetDefault>>;
    Tuple: SuccessValue<ReturnType<typeof safeParseTuple>>;
    Optional: SuccessValue<ReturnType<typeof safeParseOptional>>;
    Nullable: SuccessValue<ReturnType<typeof safeParseNullable>>;
    Default: SuccessValue<ReturnType<typeof safeParseDefault>>;
    Refine: SuccessValue<ReturnType<typeof safeParseRefine>>;
    Chain: SuccessValue<ReturnType<typeof safeParseChain>>;
    LazyRecursive: SuccessValue<ReturnType<typeof safeParseLazyRecursive>>;
    Instant: SuccessValue<ReturnType<typeof safeParseInstant>>;
    Duration: SuccessValue<ReturnType<typeof safeParseDuration>>;
    PlainDate: SuccessValue<ReturnType<typeof safeParsePlainDate>>;
    PlainDateTime: SuccessValue<ReturnType<typeof safeParsePlainDateTime>>;
    PlainTime: SuccessValue<ReturnType<typeof safeParsePlainTime>>;
    PlainYearMonth: SuccessValue<ReturnType<typeof safeParsePlainYearMonth>>;
    PlainMonthDay: SuccessValue<ReturnType<typeof safeParsePlainMonthDay>>;
    ZonedDateTime: SuccessValue<ReturnType<typeof safeParseZonedDateTime>>;
};

// Per fixture: the type the runtime's `Infer` derives from the same schema.
type Inferred = {
    [Name in SchemaName]: Infer<SchemaFor<Name>>;
};

describe('generated fixtures — result.value type', () => {
    it('matches the committed fixtures (so the type assertions check the real generated output)', async () => {
        const stale: string[] = [];
        for (const name of Object.keys(schemas) as SchemaName[]) {
            const committed = await Deno.readTextFile(new URL(`./generated-fixtures/${name}.gen.ts`, import.meta.url));
            if (committed !== toSource(schemas[name].toIR(), { name })) {
                stale.push(name);
            }
        }
        expect(stale).toEqual([]);
    });

    it('covers every fixture (Generated keys === schema names)', () => {
        // `Generated` is hand-maintained; pin its key set to the schemas so a new fixture can't slip in unchecked.
        expectTypeOf<keyof Generated>().toEqualTypeOf<SchemaName>();
    });

    it('equals Infer for every fixture', () => {
        expectTypeOf<Generated['StringPlain']>().toEqualTypeOf<Inferred['StringPlain']>();
        expectTypeOf<Generated['StringConstrained']>().toEqualTypeOf<Inferred['StringConstrained']>();
        expectTypeOf<Generated['NumberConstrained']>().toEqualTypeOf<Inferred['NumberConstrained']>();
        expectTypeOf<Generated['Bigint']>().toEqualTypeOf<Inferred['Bigint']>();
        expectTypeOf<Generated['Boolean']>().toEqualTypeOf<Inferred['Boolean']>();
        expectTypeOf<Generated['Symbol']>().toEqualTypeOf<Inferred['Symbol']>();
        expectTypeOf<Generated['Unknown']>().toEqualTypeOf<Inferred['Unknown']>();
        expectTypeOf<Generated['Never']>().toEqualTypeOf<Inferred['Never']>();
        expectTypeOf<Generated['Null']>().toEqualTypeOf<Inferred['Null']>();
        expectTypeOf<Generated['Undefined']>().toEqualTypeOf<Inferred['Undefined']>();
        expectTypeOf<Generated['Date']>().toEqualTypeOf<Inferred['Date']>();
        expectTypeOf<Generated['LiteralString']>().toEqualTypeOf<Inferred['LiteralString']>();
        expectTypeOf<Generated['LiteralNumber']>().toEqualTypeOf<Inferred['LiteralNumber']>();
        expectTypeOf<Generated['LiteralBigint']>().toEqualTypeOf<Inferred['LiteralBigint']>();
        expectTypeOf<Generated['EnumString']>().toEqualTypeOf<Inferred['EnumString']>();
        expectTypeOf<Generated['EnumNumber']>().toEqualTypeOf<Inferred['EnumNumber']>();
        expectTypeOf<Generated['UnionLiteral']>().toEqualTypeOf<Inferred['UnionLiteral']>();
        expectTypeOf<Generated['UnionMixed']>().toEqualTypeOf<Inferred['UnionMixed']>();
        expectTypeOf<Generated['ObjectSimple']>().toEqualTypeOf<Inferred['ObjectSimple']>();
        expectTypeOf<Generated['ObjectOptional']>().toEqualTypeOf<Inferred['ObjectOptional']>();
        expectTypeOf<Generated['ObjectDefault']>().toEqualTypeOf<Inferred['ObjectDefault']>();
        expectTypeOf<Generated['ObjectStrict']>().toEqualTypeOf<Inferred['ObjectStrict']>();
        expectTypeOf<Generated['ObjectPassthrough']>().toEqualTypeOf<Inferred['ObjectPassthrough']>();
        expectTypeOf<Generated['ObjectNested']>().toEqualTypeOf<Inferred['ObjectNested']>();
        expectTypeOf<Generated['ArrayString']>().toEqualTypeOf<Inferred['ArrayString']>();
        expectTypeOf<Generated['ArrayObject']>().toEqualTypeOf<Inferred['ArrayObject']>();
        expectTypeOf<Generated['Record']>().toEqualTypeOf<Inferred['Record']>();
        expectTypeOf<Generated['Map']>().toEqualTypeOf<Inferred['Map']>();
        expectTypeOf<Generated['MapDefaultValue']>().toEqualTypeOf<Inferred['MapDefaultValue']>();
        expectTypeOf<Generated['Set']>().toEqualTypeOf<Inferred['Set']>();
        expectTypeOf<Generated['SetDefault']>().toEqualTypeOf<Inferred['SetDefault']>();
        expectTypeOf<Generated['Tuple']>().toEqualTypeOf<Inferred['Tuple']>();
        expectTypeOf<Generated['Optional']>().toEqualTypeOf<Inferred['Optional']>();
        expectTypeOf<Generated['Nullable']>().toEqualTypeOf<Inferred['Nullable']>();
        expectTypeOf<Generated['Default']>().toEqualTypeOf<Inferred['Default']>();
        expectTypeOf<Generated['Refine']>().toEqualTypeOf<Inferred['Refine']>();
        expectTypeOf<Generated['Chain']>().toEqualTypeOf<Inferred['Chain']>();
        expectTypeOf<Generated['LazyRecursive']>().toEqualTypeOf<Inferred['LazyRecursive']>();
        expectTypeOf<Generated['Instant']>().toEqualTypeOf<Inferred['Instant']>();
        expectTypeOf<Generated['Duration']>().toEqualTypeOf<Inferred['Duration']>();
        expectTypeOf<Generated['PlainDate']>().toEqualTypeOf<Inferred['PlainDate']>();
        expectTypeOf<Generated['PlainDateTime']>().toEqualTypeOf<Inferred['PlainDateTime']>();
        expectTypeOf<Generated['PlainTime']>().toEqualTypeOf<Inferred['PlainTime']>();
        expectTypeOf<Generated['PlainYearMonth']>().toEqualTypeOf<Inferred['PlainYearMonth']>();
        expectTypeOf<Generated['PlainMonthDay']>().toEqualTypeOf<Inferred['PlainMonthDay']>();
        expectTypeOf<Generated['ZonedDateTime']>().toEqualTypeOf<Inferred['ZonedDateTime']>();
    });
});
