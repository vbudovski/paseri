import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts valid types', () => {
    const schema = p.record(p.number());

    fc.assert(
        fc.property(fc.object({ values: [fc.float({ noNaN: true })], maxDepth: 0 }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Record<PropertyKey, number>>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.record(p.number());

    fc.assert(
        fc.property(
            fc.anything().filter((value) => !(typeof value === 'object' && value !== null)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected Record.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

it('rejects invalid elements', () => {
    const schema = p.record(p.number());
    const data = { foo: 123, bad1: 'hello', bar: 456, bad2: 'world' };

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([
            { path: ['bad1'], message: 'Invalid type. Expected number.' },
            { path: ['bad2'], message: 'Invalid type. Expected number.' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('returns new value when child is modified', () => {
    const schema = p.record(p.object({ foo: p.string() }).strip());
    const data = { key1: { foo: 'bar', extra: 'baz' }, key2: { foo: 'qux', extra: 'quux' } };

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual({ key1: { foo: 'bar' }, key2: { foo: 'qux' } });
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('accepts optional values', () => {
    const schema = p.record(p.number()).optional();

    fc.assert(
        fc.property(
            fc.option(fc.object({ values: [fc.float({ noNaN: true })], maxDepth: 0 }), { nil: undefined }),
            (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Record<PropertyKey, number> | undefined>;
                    expect(result.value).toEqual(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

it('accepts nullable values', () => {
    const schema = p.record(p.number()).nullable();

    fc.assert(
        fc.property(
            fc.option(fc.object({ values: [fc.float({ noNaN: true })], maxDepth: 0 }), { nil: null }),
            (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Record<PropertyKey, number> | null>;
                    expect(result.value).toEqual(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

it('accepts values with Object.prototype key names', () => {
    const prototypeKeys = [...Object.getOwnPropertyNames(Object.getPrototypeOf({})), '__proto__'];

    fc.assert(
        fc.property(fc.constantFrom(...prototypeKeys), (key) => {
            const schema = p.record(p.string());
            const data = Object.create(null);
            data[key] = 'valid';

            const result = schema.safeParse(data);
            if (result.ok) {
                const expected = Object.create(null);
                expected[key] = 'valid';
                expect(result.value).toEqual(expected);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid values with Object.prototype key names', () => {
    const prototypeKeys = [...Object.getOwnPropertyNames(Object.getPrototypeOf({})), '__proto__'];

    fc.assert(
        fc.property(fc.constantFrom(...prototypeKeys), (key) => {
            const schema = p.record(p.number());
            const data = Object.create(null);
            data[key] = 'not a number';

            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [key], message: 'Invalid type. Expected number.' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});
