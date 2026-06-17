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
                        { path: [], message: 'invalid_type' },
                        { path: [], message: 'invalid_type' },
                        { path: [], message: 'invalid_value' },
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

it('discriminates on a later shared literal key when the first collides', () => {
    // `version` is the first shared literal key but its values collide; `kind` discriminates. The union
    // must construct and dispatch on `kind` rather than throwing at construction.
    const schema = p.union(
        p.object({ version: p.literal(1), kind: p.literal('a') }),
        p.object({ version: p.literal(1), kind: p.literal('b'), extra: p.number() }),
    );

    const first = schema.safeParse({ version: 1, kind: 'a' });
    if (first.ok) {
        expect(first.value).toEqual({ version: 1, kind: 'a' });
    } else {
        expect(first.ok).toBeTruthy();
    }

    // Dispatch reaches the second member: its missing field is reported, proving `kind: 'b'` selected it.
    const second = schema.safeParse({ version: 1, kind: 'b' });
    if (!second.ok) {
        expect(second.messages()).toEqual([{ path: ['extra'], message: 'missing_value' }]);
    } else {
        expect(second.ok).toBeFalsy();
    }
});

it('rejects invalid discriminator values', () => {
    const schema = p.union(
        p.object({ shape: p.literal('circle'), radius: p.number() }),
        p.object({ shape: p.literal('rectangle'), width: p.number(), height: p.number() }),
    );

    const result = schema.safeParse({});
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'invalid_discriminator_value' }]);
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
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_type' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

it("applies an earlier member's default rather than matching a later member", () => {
    // First-match semantics: member one matches `{}` by applying its default, so the union must return the
    // defaulted value even though member two would accept the input unmodified.
    const schema = p.union(p.object({ a: p.number().optional().default(1) }), p.object({ b: p.number().optional() }));
    const result = schema.safeParse({});
    expect(result.ok).toBe(true);
    if (result.ok) {
        expect(result.value).toEqual({ a: 1 });
    }
});

it('rejects undersized union', () => {
    // @ts-expect-error Intentionally silence the type error to validate runtime check.
    expect(() => p.union()).toThrow('Union must contain at least two members.');
    // @ts-expect-error Intentionally silence the type error to validate runtime check.
    expect(() => p.union(p.string())).toThrow('Union must contain at least two members.');
});

it('accepts every value of an all-literal union', () => {
    const schema = p.union(p.literal('a'), p.literal(1), p.literal(99n), p.literal(true));

    fc.assert(
        fc.property(fc.constantFrom('a', 1, 99n, true), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<'a' | 1 | 99n | true>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects a value outside an all-literal union with a single invalid_enum_value', () => {
    const schema = p.union(p.literal('a'), p.literal(1), p.literal(99n), p.literal(true));

    fc.assert(
        fc.property(
            fc.anything().filter((value) => !(value === 'a' || value === 1 || value === 99n || value === true)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_enum_value' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

it('keeps the regular per-branch path when a non-literal member is present', () => {
    // One non-literal member disables the literal-set optimization, so an invalid value must surface a
    // per-branch failure tree rather than a single invalid_enum_value.
    const schema = p.union(p.literal('a'), p.number());

    const valid = schema.safeParse(42);
    expect(valid.ok).toBe(true);

    const invalid = schema.safeParse('nope');
    if (!invalid.ok) {
        expect(invalid.messages()).toEqual([
            { path: [], message: 'invalid_value' },
            { path: [], message: 'invalid_type' },
        ]);
    } else {
        expect(invalid.ok).toBeFalsy();
    }
});

it('keeps a number distinct from its string equivalent in an all-literal union', () => {
    // The literal-set path stores values in a Set, so `1` and `'1'` stay distinct (Set keys, not object keys).
    const schema = p.union(p.literal(1), p.literal('1'));

    expect(schema.safeParse(1).ok).toBe(true);
    expect(schema.safeParse('1').ok).toBe(true);
    expect(schema.safeParse(2).ok).toBe(false);
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

    it('falls back to the next common key on duplicate values', () => {
        const elements = [
            p.object({ version: p.literal(1), kind: p.literal('a') }),
            p.object({ version: p.literal(1), kind: p.literal('b') }),
        ] as const;
        const discriminators = findDiscriminator(...elements);
        expect(discriminators).toEqual({
            found: true,
            key: 'kind',
            schemas: new Map<string, unknown>([
                ['a', elements[0]],
                ['b', elements[1]],
            ]),
            options: ["'a'", "'b'"],
        });
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
