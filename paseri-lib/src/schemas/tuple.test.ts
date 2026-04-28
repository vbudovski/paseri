import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts valid types', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n));

    fc.assert(
        fc.property(fc.tuple(fc.float({ noNaN: true }), fc.string(), fc.constant(123n)), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<[number, string, 123n]>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n));

    fc.assert(
        fc.property(
            fc.anything().filter((value) => !Array.isArray(value)),
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

it('rejects tuples that are too long', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n));
    const data = [1, 'foo', 123n, 'bad'];

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'too_long' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('rejects tuples that are too short', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n));
    const data = [1, 'foo'];

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('rejects invalid elements', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n), p.number());
    const data = [123, 666, 123n, 'foo'];

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([
            { path: [1], message: 'invalid_type' },
            { path: [3], message: 'invalid_type' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('returns new value when child is modified', () => {
    const schema = p.tuple(p.object({ foo: p.string() }).strip(), p.object({ bar: p.number() }).strip());
    const data = [
        { foo: 'hello', extra1: 'baz' },
        { bar: 123, extra2: 'qux' },
    ];

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual([{ foo: 'hello' }, { bar: 123 }]);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('preserves unmodified elements before a modified element', () => {
    const schema = p.tuple(p.string(), p.object({ foo: p.string() }).strip());
    const data = ['hello', { foo: 'bar', extra: 'strip me' }];

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual(['hello', { foo: 'bar' }]);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('preserves unmodified elements after a modified element', () => {
    const schema = p.tuple(p.object({ foo: p.string() }).strip(), p.string());
    const data = [{ foo: 'bar', extra: 'strip me' }, 'hello'];

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual([{ foo: 'bar' }, 'hello']);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('reports invalid elements after a modified element', () => {
    const schema = p.tuple(p.object({ foo: p.string() }).strip(), p.number());
    const data = [{ foo: 'bar', extra: 'strip me' }, 'invalid'];

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [1], message: 'invalid_type' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('accepts optional values', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n)).optional();

    fc.assert(
        fc.property(
            fc.option(fc.tuple(fc.float({ noNaN: true }), fc.string(), fc.constant(123n)), { nil: undefined }),
            (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<[number, string, 123n] | undefined>;
                    expect(result.value).toEqual(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

it('accepts nullable values', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n)).nullable();

    fc.assert(
        fc.property(
            fc.option(fc.tuple(fc.float({ noNaN: true }), fc.string(), fc.constant(123n)), { nil: null }),
            (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<[number, string, 123n] | null>;
                    expect(result.value).toEqual(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});
