import type { Infer } from '@paseri/paseri';
import * as p from '@paseri/paseri';
import '@paseri/paseri/introspect';
import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import type { ArrayObject } from './generated-fixtures/ArrayObject.gen.ts';
import type { ArrayString } from './generated-fixtures/ArrayString.gen.ts';
import type { Bigint } from './generated-fixtures/Bigint.gen.ts';
import type { Boolean as BooleanSchema } from './generated-fixtures/Boolean.gen.ts';
import type { Chain } from './generated-fixtures/Chain.gen.ts';
import type { Date as DateSchema } from './generated-fixtures/Date.gen.ts';
import type { Default } from './generated-fixtures/Default.gen.ts';
import type { Duration } from './generated-fixtures/Duration.gen.ts';
import type { EnumNumber } from './generated-fixtures/EnumNumber.gen.ts';
import type { EnumString } from './generated-fixtures/EnumString.gen.ts';
import type { Instant } from './generated-fixtures/Instant.gen.ts';
import type { LazyRecursive } from './generated-fixtures/LazyRecursive.gen.ts';
import type { LiteralBigint } from './generated-fixtures/LiteralBigint.gen.ts';
import type { LiteralNumber } from './generated-fixtures/LiteralNumber.gen.ts';
import type { LiteralString } from './generated-fixtures/LiteralString.gen.ts';
import type { Map as MapSchema } from './generated-fixtures/Map.gen.ts';
import type { MapDefaultValue } from './generated-fixtures/MapDefaultValue.gen.ts';
import type { Never } from './generated-fixtures/Never.gen.ts';
import type { Null } from './generated-fixtures/Null.gen.ts';
import type { Nullable } from './generated-fixtures/Nullable.gen.ts';
import type { NumberConstrained } from './generated-fixtures/NumberConstrained.gen.ts';
import type { ObjectDefault } from './generated-fixtures/ObjectDefault.gen.ts';
import type { ObjectNested } from './generated-fixtures/ObjectNested.gen.ts';
import type { ObjectOptional } from './generated-fixtures/ObjectOptional.gen.ts';
import type { ObjectPassthrough } from './generated-fixtures/ObjectPassthrough.gen.ts';
import type { ObjectSimple } from './generated-fixtures/ObjectSimple.gen.ts';
import type { ObjectStrict } from './generated-fixtures/ObjectStrict.gen.ts';
import type { Optional } from './generated-fixtures/Optional.gen.ts';
import type { PlainDate } from './generated-fixtures/PlainDate.gen.ts';
import type { PlainDateTime } from './generated-fixtures/PlainDateTime.gen.ts';
import type { PlainMonthDay } from './generated-fixtures/PlainMonthDay.gen.ts';
import type { PlainTime } from './generated-fixtures/PlainTime.gen.ts';
import type { PlainYearMonth } from './generated-fixtures/PlainYearMonth.gen.ts';
import type { Record } from './generated-fixtures/Record.gen.ts';
import type { Refine } from './generated-fixtures/Refine.gen.ts';
import type { Set as SetSchema } from './generated-fixtures/Set.gen.ts';
import type { SetDefault } from './generated-fixtures/SetDefault.gen.ts';
import type { StringConstrained } from './generated-fixtures/StringConstrained.gen.ts';
import type { StringPlain } from './generated-fixtures/StringPlain.gen.ts';
import type { Symbol as SymbolSchema } from './generated-fixtures/Symbol.gen.ts';
import type { Tuple } from './generated-fixtures/Tuple.gen.ts';
import type { Undefined } from './generated-fixtures/Undefined.gen.ts';
import type { UnionLiteral } from './generated-fixtures/UnionLiteral.gen.ts';
import type { UnionMixed } from './generated-fixtures/UnionMixed.gen.ts';
import type { Unknown } from './generated-fixtures/Unknown.gen.ts';
import type { ZonedDateTime } from './generated-fixtures/ZonedDateTime.gen.ts';
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
    StringPlain: SuccessValue<ReturnType<(typeof StringPlain)['safeParse']>>;
    StringConstrained: SuccessValue<ReturnType<(typeof StringConstrained)['safeParse']>>;
    NumberConstrained: SuccessValue<ReturnType<(typeof NumberConstrained)['safeParse']>>;
    Bigint: SuccessValue<ReturnType<(typeof Bigint)['safeParse']>>;
    Boolean: SuccessValue<ReturnType<(typeof BooleanSchema)['safeParse']>>;
    Symbol: SuccessValue<ReturnType<(typeof SymbolSchema)['safeParse']>>;
    Unknown: SuccessValue<ReturnType<(typeof Unknown)['safeParse']>>;
    Never: SuccessValue<ReturnType<(typeof Never)['safeParse']>>;
    Null: SuccessValue<ReturnType<(typeof Null)['safeParse']>>;
    Undefined: SuccessValue<ReturnType<(typeof Undefined)['safeParse']>>;
    Date: SuccessValue<ReturnType<(typeof DateSchema)['safeParse']>>;
    LiteralString: SuccessValue<ReturnType<(typeof LiteralString)['safeParse']>>;
    LiteralNumber: SuccessValue<ReturnType<(typeof LiteralNumber)['safeParse']>>;
    LiteralBigint: SuccessValue<ReturnType<(typeof LiteralBigint)['safeParse']>>;
    EnumString: SuccessValue<ReturnType<(typeof EnumString)['safeParse']>>;
    EnumNumber: SuccessValue<ReturnType<(typeof EnumNumber)['safeParse']>>;
    UnionLiteral: SuccessValue<ReturnType<(typeof UnionLiteral)['safeParse']>>;
    UnionMixed: SuccessValue<ReturnType<(typeof UnionMixed)['safeParse']>>;
    ObjectSimple: SuccessValue<ReturnType<(typeof ObjectSimple)['safeParse']>>;
    ObjectOptional: SuccessValue<ReturnType<(typeof ObjectOptional)['safeParse']>>;
    ObjectDefault: SuccessValue<ReturnType<(typeof ObjectDefault)['safeParse']>>;
    ObjectStrict: SuccessValue<ReturnType<(typeof ObjectStrict)['safeParse']>>;
    ObjectPassthrough: SuccessValue<ReturnType<(typeof ObjectPassthrough)['safeParse']>>;
    ObjectNested: SuccessValue<ReturnType<(typeof ObjectNested)['safeParse']>>;
    ArrayString: SuccessValue<ReturnType<(typeof ArrayString)['safeParse']>>;
    ArrayObject: SuccessValue<ReturnType<(typeof ArrayObject)['safeParse']>>;
    Record: SuccessValue<ReturnType<(typeof Record)['safeParse']>>;
    Map: SuccessValue<ReturnType<(typeof MapSchema)['safeParse']>>;
    MapDefaultValue: SuccessValue<ReturnType<(typeof MapDefaultValue)['safeParse']>>;
    Set: SuccessValue<ReturnType<(typeof SetSchema)['safeParse']>>;
    SetDefault: SuccessValue<ReturnType<(typeof SetDefault)['safeParse']>>;
    Tuple: SuccessValue<ReturnType<(typeof Tuple)['safeParse']>>;
    Optional: SuccessValue<ReturnType<(typeof Optional)['safeParse']>>;
    Nullable: SuccessValue<ReturnType<(typeof Nullable)['safeParse']>>;
    Default: SuccessValue<ReturnType<(typeof Default)['safeParse']>>;
    Refine: SuccessValue<ReturnType<(typeof Refine)['safeParse']>>;
    Chain: SuccessValue<ReturnType<(typeof Chain)['safeParse']>>;
    LazyRecursive: SuccessValue<ReturnType<(typeof LazyRecursive)['safeParse']>>;
    Instant: SuccessValue<ReturnType<(typeof Instant)['safeParse']>>;
    Duration: SuccessValue<ReturnType<(typeof Duration)['safeParse']>>;
    PlainDate: SuccessValue<ReturnType<(typeof PlainDate)['safeParse']>>;
    PlainDateTime: SuccessValue<ReturnType<(typeof PlainDateTime)['safeParse']>>;
    PlainTime: SuccessValue<ReturnType<(typeof PlainTime)['safeParse']>>;
    PlainYearMonth: SuccessValue<ReturnType<(typeof PlainYearMonth)['safeParse']>>;
    PlainMonthDay: SuccessValue<ReturnType<(typeof PlainMonthDay)['safeParse']>>;
    ZonedDateTime: SuccessValue<ReturnType<(typeof ZonedDateTime)['safeParse']>>;
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
