import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';
import { findDiscriminator } from './union.ts';

it('accepts valid types', () => {
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

it('rejects invalid types', () => {
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

it('returns modified value from transforming union member', () => {
    const schema = p.union(p.object({ foo: p.string() }).strip(), p.number());
    const data = { foo: 'bar', extra: 'strip me' };

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual({ foo: 'bar' });
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('accepts optional values', () => {
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

it('accepts nullable values', () => {
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

it('accepts valid discriminated union values', () => {
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

it('rejects invalid discriminator values', () => {
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

it('rejects non-object input to discriminated union', () => {
    const schema = p.union(
        p.object({ shape: p.literal('circle'), radius: p.number() }),
        p.object({ shape: p.literal('rectangle'), width: p.number(), height: p.number() }),
    );

    fc.assert(
        fc.property(
            fc.anything().filter((value) => !(typeof value === 'object' && value !== null)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected object.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

describe('findDiscriminator', () => {
    it('returns false when no objects are present', () => {
        const elements = [p.number(), p.string()] as const;
        const discriminators = findDiscriminator(...elements);
        expect(discriminators).toEqual({ found: false });
    });

    it('returns false when no common keys exist', () => {
        const elements = [p.object({ foo: p.literal('foo') }), p.object({ bar: p.literal('bar') })] as const;
        const discriminators = findDiscriminator(...elements);
        expect(discriminators).toEqual({ found: false });
    });

    it('finds discriminator with one common key', () => {
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

    it('returns false when common key is not a literal', () => {
        const elements = [
            p.object({ foo: p.literal('foo'), bar: p.literal('bar1') }),
            p.object({ bar: p.string(), baz: p.literal('baz') }),
        ] as const;
        const discriminators = findDiscriminator(...elements);
        expect(discriminators).toEqual({ found: false });
    });

    it('throws on duplicate discriminator values', () => {
        const elements = [
            p.object({ type: p.literal('dog'), name: p.string() }),
            p.object({ type: p.literal('dog'), bark: p.boolean() }),
            p.object({ type: p.literal('cat'), purrs: p.boolean() }),
        ] as const;
        expect(() => findDiscriminator(...elements)).toThrow();
    });

    it('finds discriminator with two common keys', () => {
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
