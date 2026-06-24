import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts valid types', () => {
    const schema = p.map(p.number(), p.string());

    fc.assert(
        fc.property(fc.array(fc.tuple(fc.float({ noNaN: true }), fc.string())), (data) => {
            const dataAsMap = new Map(data);

            const result = schema.safeParse(dataAsMap);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Map<number, string>>();
                expect(result.value).toEqual(dataAsMap);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.map(p.number(), p.string());

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
    it('accepts in-range and rejects out-of-range values for any bound', () => {
        fc.assert(
            fc.property(
                fc.nat({ max: 15 }),
                fc.array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { maxLength: 30 }),
                (bound, data) => {
                    const dataAsMap = new Map(data);
                    const schema = p.map(p.number(), p.string()).min(bound);
                    const result = schema.safeParse(dataAsMap);
                    if (dataAsMap.size >= bound) {
                        if (result.ok) {
                            expectTypeOf(result.value).toEqualTypeOf<Map<number, string>>();
                            expect(result.value).toBe(dataAsMap);
                        } else {
                            expect(result.ok).toBeTruthy();
                        }
                    } else {
                        if (!result.ok) {
                            expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
                        } else {
                            expect(result.ok).toBeFalsy();
                        }
                    }
                },
            ),
        );
    });

    it('reports only the size issue when a too-small map also has invalid entries', () => {
        const schema = p.map(p.number(), p.string()).min(3);
        const result = schema.safeParse(new Map<number, unknown>([[1, 2]]));
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('rejects invalid bounds', () => {
        expect(() => p.map(p.number(), p.string()).min(Number.NaN)).toThrow();
        expect(() => p.map(p.number(), p.string()).min(-1)).toThrow();
        expect(() => p.map(p.number(), p.string()).min(1.5)).toThrow();
        expect(() => p.map(p.number(), p.string()).min(Number.POSITIVE_INFINITY)).toThrow();
        expect(() => p.map(p.number(), p.string()).min(0)).not.toThrow();
    });

    it('is immutable', () => {
        const original = p.map(p.number(), p.string());
        const modified = original.min(3);
        expect(modified).not.toEqual(original);
        const branched = modified.max(10);
        expect(branched).not.toEqual(modified);
    });
});

describe('max', () => {
    it('accepts in-range and rejects out-of-range values for any bound', () => {
        fc.assert(
            fc.property(
                fc.nat({ max: 15 }),
                fc.array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { maxLength: 30 }),
                (bound, data) => {
                    const dataAsMap = new Map(data);
                    const schema = p.map(p.number(), p.string()).max(bound);
                    const result = schema.safeParse(dataAsMap);
                    if (dataAsMap.size <= bound) {
                        if (result.ok) {
                            expectTypeOf(result.value).toEqualTypeOf<Map<number, string>>();
                            expect(result.value).toBe(dataAsMap);
                        } else {
                            expect(result.ok).toBeTruthy();
                        }
                    } else {
                        if (!result.ok) {
                            expect(result.messages()).toEqual([{ path: [], message: 'too_long' }]);
                        } else {
                            expect(result.ok).toBeFalsy();
                        }
                    }
                },
            ),
        );
    });

    it('reports only the size issue when a too-large map also has invalid entries', () => {
        const schema = p.map(p.number(), p.string()).max(1);
        const result = schema.safeParse(
            new Map<number, unknown>([
                [1, 'a'],
                [2, 3],
            ]),
        );
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: 'too_long' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('rejects invalid bounds', () => {
        expect(() => p.map(p.number(), p.string()).max(Number.NaN)).toThrow();
        expect(() => p.map(p.number(), p.string()).max(-1)).toThrow();
        expect(() => p.map(p.number(), p.string()).max(1.5)).toThrow();
        expect(() => p.map(p.number(), p.string()).max(Number.POSITIVE_INFINITY)).toThrow();
        expect(() => p.map(p.number(), p.string()).max(0)).not.toThrow();
    });

    it('is immutable', () => {
        const original = p.map(p.number(), p.string());
        const modified = original.max(3);
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

describe('contradictory bounds', () => {
    it('throws when the minimum size exceeds the maximum size', () => {
        expect(() => p.map(p.string(), p.number()).min(5).max(3)).toThrow('Minimum size must not exceed maximum size.');
        expect(() => p.map(p.string(), p.number()).max(3).min(5)).toThrow('Minimum size must not exceed maximum size.');
    });

    it('allows equal minimum and maximum sizes', () => {
        expect(() => p.map(p.string(), p.number()).min(3).max(3)).not.toThrow();
    });
});

describe('size', () => {
    it('accepts a map whose size equals the bound', () => {
        fc.assert(
            fc.property(fc.array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { maxLength: 30 }), (data) => {
                const dataAsMap = new Map(data);
                const schema = p.map(p.number(), p.string()).size(dataAsMap.size);
                const result = schema.safeParse(dataAsMap);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Map<number, string>>();
                    expect(result.value).toBe(dataAsMap);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects a larger map as too_long', () => {
        fc.assert(
            fc.property(
                fc.array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { maxLength: 30 }),
                fc.nat({ max: 30 }),
                (data, bound) => {
                    const dataAsMap = new Map(data);
                    fc.pre(dataAsMap.size > bound);
                    const schema = p.map(p.number(), p.string()).size(bound);
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

    it('rejects a smaller map as too_short', () => {
        fc.assert(
            fc.property(
                fc.array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { maxLength: 30 }),
                fc.nat({ max: 30 }),
                (data, bound) => {
                    const dataAsMap = new Map(data);
                    fc.pre(dataAsMap.size < bound);
                    const schema = p.map(p.number(), p.string()).size(bound);
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

    it('rejects invalid bounds', () => {
        expect(() => p.map(p.number(), p.string()).size(Number.NaN)).toThrow();
        expect(() => p.map(p.number(), p.string()).size(-1)).toThrow();
        expect(() => p.map(p.number(), p.string()).size(1.5)).toThrow();
        expect(() => p.map(p.number(), p.string()).size(Number.POSITIVE_INFINITY)).toThrow();
        expect(() => p.map(p.number(), p.string()).size(0)).not.toThrow();
    });

    it('is immutable', () => {
        const original = p.map(p.number(), p.string());
        const modified = original.size(3);
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

it('rejects when transform produces duplicate keys', () => {
    const lower = p.string().chain(p.string(), (value) => p.ok(value.toLowerCase()));
    const schema = p.map(lower, p.number());
    const data = new Map([
        ['HELLO', 1],
        ['hello', 2],
    ]);

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'duplicate_key' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('rejects invalid elements', () => {
    const schema = p.map(p.number(), p.string());
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
    const schema = p.map(p.string(), p.object({ foo: p.number() }).strip());
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
    const schema = p.map(p.string(), p.object({ foo: p.number() }).strip());
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
    const schema = p.map(p.string(), p.object({ foo: p.number() }).strip());
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
    const schema = p.map(p.string(), p.object({ foo: p.number() }).strip());
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
    const schema = p.map(p.number(), p.string()).optional();

    fc.assert(
        fc.property(
            fc.option(fc.array(fc.tuple(fc.float({ noNaN: true }), fc.string())), { nil: undefined }),
            (data) => {
                const dataAsMap = new Map(data);

                const result = schema.safeParse(dataAsMap);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Map<number, string> | undefined>();
                    expect(result.value).toEqual(dataAsMap);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

it('accepts nullable values', () => {
    const schema = p.map(p.number(), p.string()).nullable();

    fc.assert(
        fc.property(fc.option(fc.array(fc.tuple(fc.float({ noNaN: true }), fc.string())), { nil: null }), (data) => {
            const dataAsMap = new Map(data);

            const result = schema.safeParse(dataAsMap);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Map<number, string> | null>();
                expect(result.value).toEqual(dataAsMap);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
