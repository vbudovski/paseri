// Source of truth for the committed fixtures here. `bin/generate_fixtures.ts` emits one `<name>.gen.ts` per entry
// (plus the `index.gen.ts` barrel) from `toSource`; `../generated-fixtures.test.ts` asserts the output is current and
// that every emittable IR kind is covered. Type-validity is a function of IR *structure*, not values, so one schema
// per emitter surface is complete coverage.

import * as p from '@paseri/paseri';
import '@paseri/paseri/introspect';
import { toSource } from '../toSource.ts';

interface MatrixEntry {
    readonly name: string;
    readonly schema: p.Schema<unknown>;
}

type Node = { value: string; next?: Node | undefined };
const recursive: p.Schema<Node> = p.lazy(() => p.object({ value: p.string(), next: recursive.optional() }));
const temporalBound = Temporal.PlainDate.from('2020-01-01');

// One entry per emitter surface. `next: recursive.optional()` exercises `ref`; the temporal kinds each have their own
// emitter so each appears explicitly. The drift guard in the test ties this list to the `emitters/` directory.
const MATRIX: readonly MatrixEntry[] = [
    { name: 'StringPlain', schema: p.string() },
    {
        name: 'StringConstrained',
        schema: p
            .string()
            .min(1)
            .max(10)
            .regex(/^[a-z]+$/),
    },
    { name: 'NumberConstrained', schema: p.number().gte(0).lte(100) },
    { name: 'Bigint', schema: p.bigint() },
    { name: 'Boolean', schema: p.boolean() },
    { name: 'Symbol', schema: p.symbol() },
    { name: 'Unknown', schema: p.unknown() },
    { name: 'Never', schema: p.never() },
    { name: 'Null', schema: p.null() },
    { name: 'Undefined', schema: p.undefined() },
    { name: 'Date', schema: p.date() },
    { name: 'LiteralString', schema: p.literal('x') },
    { name: 'LiteralNumber', schema: p.literal(5) },
    { name: 'LiteralBigint', schema: p.literal(5n) },
    { name: 'EnumString', schema: p.enum('a', 'b', 'c') },
    { name: 'EnumNumber', schema: p.enum(1, 2, 3) },
    { name: 'UnionLiteral', schema: p.union(p.literal('a'), p.literal('b'), p.literal('c')) },
    { name: 'UnionMixed', schema: p.union(p.string(), p.number()) },
    { name: 'ObjectSimple', schema: p.object({ foo: p.string() }) },
    { name: 'ObjectOptional', schema: p.object({ foo: p.string().optional() }) },
    { name: 'ObjectDefault', schema: p.object({ foo: p.string(), count: p.number().optional().default(0) }) },
    { name: 'ObjectStrict', schema: p.object({ foo: p.string() }).strict() },
    { name: 'ObjectPassthrough', schema: p.object({ foo: p.string() }).passthrough() },
    { name: 'ObjectNested', schema: p.object({ inner: p.object({ baz: p.number() }) }) },
    {
        name: 'ObjectStripNested',
        schema: p.object({ inner: p.object({ baz: p.number() }).strip() }).strip(),
    },
    {
        name: 'ObjectStripDefault',
        schema: p.object({ host: p.string(), port: p.number().optional().default(123) }).strip(),
    },
    { name: 'ArrayString', schema: p.array(p.string()) },
    { name: 'ArrayObject', schema: p.array(p.object({ id: p.number() })) },
    { name: 'Record', schema: p.record(p.number()) },
    { name: 'Map', schema: p.map(p.string(), p.number()) },
    { name: 'MapDefaultValue', schema: p.map(p.string(), p.number().optional().default(0)) },
    { name: 'Set', schema: p.set(p.string()) },
    { name: 'SetDefault', schema: p.set(p.string().optional().default('x')) },
    { name: 'Tuple', schema: p.tuple(p.string(), p.number(), p.literal(123n)) },
    { name: 'Optional', schema: p.string().optional() },
    { name: 'Nullable', schema: p.number().nullable() },
    { name: 'Default', schema: p.string().optional().default('x') },
    // The default's inner still admits `undefined` (a union with `p.undefined()`), so the output type must keep it —
    // exercises that the `default` type emit mirrors Infer instead of unconditionally excluding `undefined`.
    {
        name: 'DefaultUnionUndefined',
        schema: p.union(p.string(), p.undefined()).optional().default('x'),
    },
    { name: 'Refine', schema: p.number().refine((value) => value > 0, { code: 'positive' }) },
    { name: 'Chain', schema: p.string().chain(p.number(), (value) => ({ ok: true, value: Number(value) })) },
    { name: 'LazyRecursive', schema: recursive },
    { name: 'Instant', schema: p.instant() },
    { name: 'Duration', schema: p.duration() },
    { name: 'PlainDate', schema: p.plainDate().min(temporalBound).max(temporalBound) },
    { name: 'PlainDateTime', schema: p.plainDateTime() },
    { name: 'PlainTime', schema: p.plainTime() },
    { name: 'PlainYearMonth', schema: p.plainYearMonth() },
    { name: 'PlainMonthDay', schema: p.plainMonthDay() },
    { name: 'ZonedDateTime', schema: p.zonedDateTime() },
];

// Shared by `bin/generate_fixtures.ts` (writes the files) and `../generated-fixtures.test.ts` (asserts they are
// current), so the two can never disagree on what the committed output should be.
function fixtureSource(entry: MatrixEntry): string {
    return toSource(entry.schema.toIR(), { name: entry.name });
}

// The barrel side-effect-imports every fixture so a single `import` of it pulls the whole set into the test's static
// module graph, where `deno check` type-checks them.
function barrelSource(): string {
    const imports = MATRIX.map((entry) => `import './${entry.name}.gen.ts';`).join('\n');
    return `// Auto-generated by \`deno task generate_fixtures\`. Do not edit by hand.\n\n${imports}\n`;
}

export { barrelSource, fixtureSource, MATRIX, type MatrixEntry };
