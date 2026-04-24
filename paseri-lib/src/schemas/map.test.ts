import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts valid types', () => {
    const schema = p.map(p.number(), p.string())();

    fc.assert(
        fc.property(fc.array(fc.tuple(fc.float({ noNaN: true }), fc.string())), (data) => {
            const dataAsMap = new Map(data);

            const result = schema.safeParse(dataAsMap);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Map<number, string>>;
                expect(result.value).toEqual(dataAsMap);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.map(p.number(), p.string())();

    fc.assert(
        fc.property(fc.anything(), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'invalid_type' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

describe('min', () => {
    it('accepts valid values', () => {
        const schema = p.map(p.number(), p.string())(p.minSize(3));

        fc.assert(
            fc.property(
                fc
                    .array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { minLength: 3 })
                    .filter((value) => new Map(value).size >= 3),
                (data) => {
                    const dataAsMap = new Map(data);

                    const result = schema.safeParse(dataAsMap);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Map<number, string>>;
                        expect(result.value).toBe(dataAsMap);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.map(p.number(), p.string())(p.minSize(3));

        fc.assert(
            fc.property(
                fc
                    .array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { maxLength: 2 })
                    .filter((value) => new Map(value).size <= 2),
                (data) => {
                    const dataAsMap = new Map(data);

                    const result = schema.safeParse(dataAsMap);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('rejects when transformation causes deduplication below minimum', () => {
        const lower = p.chain(p.string(), p.string(), (value) => p.ok(value.toLowerCase()));
        const schema = p.map(lower, p.number())(p.minSize(2));
        const data = new Map([
            ['A', 1],
            ['a', 2],
        ]); // size 2, but keys collapse → size 1

        const result = schema.safeParse(data);
        expect(result.ok).toBe(false);
    });

    it('throws on NaN', () => {
        expect(() => p.minSize(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.map(p.number(), p.string())();
        const modified = p.map(p.number(), p.string())(p.minSize(3));
        expect(modified).not.toEqual(original);
        const branched = p.map(p.number(), p.string())(p.minSize(3), p.maxSize(10));
        expect(branched).not.toEqual(modified);
    });
});

describe('max', () => {
    it('accepts valid values', () => {
        const schema = p.map(p.number(), p.string())(p.maxSize(3));

        fc.assert(
            fc.property(
                fc
                    .array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { maxLength: 3 })
                    .filter((value) => new Map(value).size <= 3),
                (data) => {
                    const dataAsMap = new Map(data);

                    const result = schema.safeParse(dataAsMap);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Map<number, string>>;
                        expect(result.value).toBe(dataAsMap);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.map(p.number(), p.string())(p.maxSize(3));

        fc.assert(
            fc.property(
                fc
                    .array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { minLength: 4 })
                    .filter((value) => new Map(value).size >= 4),
                (data) => {
                    const dataAsMap = new Map(data);

                    const result = schema.safeParse(dataAsMap);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'too_long' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('throws on NaN', () => {
        expect(() => p.maxSize(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.map(p.number(), p.string())();
        const modified = p.map(p.number(), p.string())(p.maxSize(3));
        expect(modified).not.toEqual(original);
        const branched = p.map(p.number(), p.string())(p.maxSize(3), p.minSize(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('size', () => {
    it('accepts valid values', () => {
        const schema = p.map(p.number(), p.string())(p.minSize(3), p.maxSize(3));

        fc.assert(
            fc.property(
                fc
                    .array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { minLength: 3, maxLength: 3 })
                    .filter((value) => new Map(value).size === 3),
                (data) => {
                    const dataAsMap = new Map(data);

                    const result = schema.safeParse(dataAsMap);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Map<number, string>>;
                        expect(result.value).toBe(dataAsMap);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects values that are too long', () => {
        const schema = p.map(p.number(), p.string())(p.minSize(3), p.maxSize(3));

        fc.assert(
            fc.property(
                fc
                    .array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { minLength: 4 })
                    .filter((value) => new Map(value).size >= 4),
                (data) => {
                    const dataAsMap = new Map(data);

                    const result = schema.safeParse(dataAsMap);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'too_long' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('rejects values that are too short', () => {
        const schema = p.map(p.number(), p.string())(p.minSize(3), p.maxSize(3));

        fc.assert(
            fc.property(
                fc
                    .array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { maxLength: 2 })
                    .filter((value) => new Map(value).size <= 2),
                (data) => {
                    const dataAsMap = new Map(data);

                    const result = schema.safeParse(dataAsMap);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('rejects when transformation causes deduplication below exact size', () => {
        const lower = p.chain(p.string(), p.string(), (value) => p.ok(value.toLowerCase()));
        const schema = p.map(lower, p.number())(p.minSize(2), p.maxSize(2));
        const data = new Map([
            ['A', 1],
            ['a', 2],
        ]); // size 2, but keys collapse → size 1

        const result = schema.safeParse(data);
        expect(result.ok).toBe(false);
    });

    it('throws on NaN', () => {
        expect(() => p.minSize(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.map(p.number(), p.string())();
        const modified = p.map(p.number(), p.string())(p.minSize(3), p.maxSize(3));
        expect(modified).not.toEqual(original);
        const branched = p.map(p.number(), p.string())(p.minSize(3), p.maxSize(3), p.minSize(1));
        expect(branched).not.toEqual(modified);
    });
});

it('rejects invalid elements', () => {
    const schema = p.map(p.number(), p.string())();
    const data = new Map<unknown, unknown>([
        [1, 'valid1'], // Valid.
        ['foo', 'bar'], // Invalid key.
        [2, 'valid2'], // Valid.
        [666, 456], // Invalid value.
        [3, 'valid3'], // Valid.
        ['bar', 789], // Invalid key and value.
        [4, 'valid4'], // Valid.
    ]);

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([
            { path: [1, 0], message: 'invalid_type' },
            { path: [3, 1], message: 'invalid_type' },
            { path: [5, 0], message: 'invalid_type' },
            { path: [5, 1], message: 'invalid_type' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('returns new value when child value is modified', () => {
    const schema = p.map(p.string(), p.object({ foo: p.number() }).strip())();
    const data = new Map<string, Record<string, unknown>>([
        ['a', { foo: 1, extra: 'baz' }],
        ['b', { foo: 2, extra: 'qux' }],
    ]);

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual(
            new Map([
                ['a', { foo: 1 }],
                ['b', { foo: 2 }],
            ]),
        );
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('preserves unmodified entries before a modified entry', () => {
    const schema = p.map(p.string(), p.object({ foo: p.number() }).strip())();
    const data = new Map<string, Record<string, unknown>>([
        ['a', { foo: 1 }],
        ['b', { foo: 2 }],
        ['c', { foo: 3, extra: 'strip me' }],
    ]);

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual(
            new Map([
                ['a', { foo: 1 }],
                ['b', { foo: 2 }],
                ['c', { foo: 3 }],
            ]),
        );
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('preserves unmodified entries after a modified entry', () => {
    const schema = p.map(p.string(), p.object({ foo: p.number() }).strip())();
    const data = new Map<string, Record<string, unknown>>([
        ['a', { foo: 1, extra: 'strip me' }],
        ['b', { foo: 2 }],
        ['c', { foo: 3 }],
    ]);

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual(
            new Map([
                ['a', { foo: 1 }],
                ['b', { foo: 2 }],
                ['c', { foo: 3 }],
            ]),
        );
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('reports invalid entries after a modified entry', () => {
    const schema = p.map(p.string(), p.object({ foo: p.number() }).strip())();
    const data = new Map<string, unknown>([
        ['a', { foo: 1, extra: 'strip me' }],
        ['b', 'invalid'],
    ]);

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [1, 1], message: 'invalid_type' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('accepts optional values', () => {
    const schema = p.optional(p.map(p.number(), p.string())());

    fc.assert(
        fc.property(
            fc.option(fc.array(fc.tuple(fc.float({ noNaN: true }), fc.string())), { nil: undefined }),
            (data) => {
                const dataAsMap = new Map(data);

                const result = schema.safeParse(dataAsMap);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Map<number, string> | undefined>;
                    expect(result.value).toEqual(dataAsMap);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

it('accepts nullable values', () => {
    const schema = p.nullable(p.map(p.number(), p.string())());

    fc.assert(
        fc.property(fc.option(fc.array(fc.tuple(fc.float({ noNaN: true }), fc.string())), { nil: null }), (data) => {
            const dataAsMap = new Map(data);

            const result = schema.safeParse(dataAsMap);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Map<number, string> | null>;
                expect(result.value).toEqual(dataAsMap);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
