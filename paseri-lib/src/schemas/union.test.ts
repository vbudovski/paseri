import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';
import { findDiscriminator } from './union.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.union(p.string(), p.number(), p.literal(123n));

    fc.assert(
        fc.property(fc.oneof(fc.string(), fc.float({ noNaN: true }), fc.constant(123n)), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string | number | 123n>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid type', () => {
    const schema = p.union(p.string(), p.number(), p.literal(123n));

    fc.assert(
        fc.property(
            fc
                .anything()
                .filter((value) => !(typeof value === 'string' || typeof value === 'number' || value === 123n)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([
                        { path: [], message: 'Invalid type. Expected string.' },
                        { path: [], message: 'Invalid type. Expected number.' },
                        { path: [], message: 'Invalid value. Expected 123n.' },
                    ]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Optional', () => {
    const schema = p.union(p.string(), p.number(), p.literal(123n)).optional();

    fc.assert(
        fc.property(
            fc.option(fc.oneof(fc.string(), fc.float({ noNaN: true }), fc.constant(123n)), { nil: undefined }),
            (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<string | number | 123n | undefined>;
                    expect(result.value).toEqual(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Nullable', () => {
    const schema = p.union(p.string(), p.number(), p.literal(123n)).nullable();

    fc.assert(
        fc.property(
            fc.option(fc.oneof(fc.string(), fc.float({ noNaN: true }), fc.constant(123n)), { nil: null }),
            (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<string | number | 123n | null>;
                    expect(result.value).toEqual(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Discriminated union', () => {
    const schema = p.union(
        p.object({ shape: p.literal('circle'), radius: p.number() }),
        p.object({ shape: p.literal('rectangle'), width: p.number(), height: p.number() }),
    );

    fc.assert(
        fc.property(
            fc.oneof(
                fc.record({ shape: fc.constant('circle'), radius: fc.float({ noNaN: true }) }),
                fc.record({
                    shape: fc.constant('rectangle'),
                    width: fc.float({ noNaN: true }),
                    height: fc.float({ noNaN: true }),
                }),
            ),
            (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<
                        { shape: 'circle'; radius: number } | { shape: 'rectangle'; width: number; height: number }
                    >;
                    expect(result.value).toEqual(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Invalid discriminator', () => {
    const schema = p.union(
        p.object({ shape: p.literal('circle'), radius: p.number() }),
        p.object({ shape: p.literal('rectangle'), width: p.number(), height: p.number() }),
    );

    const result = schema.safeParse({});
    if (!result.ok) {
        expect(result.messages()).toEqual([
            { path: [], message: "Invalid discriminator value. Expected 'circle' | 'rectangle'." },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('findDiscriminator', async (t) => {
    await t.step('No objects', () => {
        const elements = [p.number(), p.string()] as const;
        const discriminators = findDiscriminator(...elements);
        expect(discriminators).toEqual({ found: false });
    });

    await t.step('No common keys', () => {
        const elements = [p.object({ foo: p.literal('foo') }), p.object({ bar: p.literal('bar') })] as const;
        const discriminators = findDiscriminator(...elements);
        expect(discriminators).toEqual({ found: false });
    });

    await t.step('One common key', () => {
        const elements = [
            p.object({ foo: p.literal('foo'), bar: p.literal('bar1') }),
            p.object({ bar: p.literal('bar2'), baz: p.literal('baz') }),
        ] as const;
        const discriminators = findDiscriminator(...elements);
        expect(discriminators).toEqual({
            found: true,
            key: 'bar',
            schemas: new Map<string, unknown>([
                ['bar1', elements[0]],
                ['bar2', elements[1]],
            ]),
            options: ["'bar1'", "'bar2'"],
        });
    });

    await t.step('One common key not literal', () => {
        const elements = [
            p.object({ foo: p.literal('foo'), bar: p.literal('bar1') }),
            p.object({ bar: p.string(), baz: p.literal('baz') }),
        ] as const;
        const discriminators = findDiscriminator(...elements);
        expect(discriminators).toEqual({ found: false });
    });

    await t.step('Two common keys', () => {
        const elements = [
            p.object({ foo: p.literal('foo1'), bar: p.literal('bar1') }),
            p.object({ bar: p.literal('bar2'), baz: p.literal('baz'), foo: p.literal('foo2') }),
        ] as const;
        const discriminators = findDiscriminator(...elements);
        expect(discriminators).toEqual({
            found: true,
            key: 'foo',
            schemas: new Map<string, unknown>([
                ['foo1', elements[0]],
                ['foo2', elements[1]],
            ]),
            options: ["'foo1'", "'foo2'"],
        });
    });
});
