import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts valid types', () => {
    const schema = p.set(p.number());

    fc.assert(
        fc.property(fc.array(fc.float({ noNaN: true })), (data) => {
            const dataAsSet = new Set(data);

            const result = schema.safeParse(dataAsSet);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Set<number>>;
                expect(result.value).toEqual(dataAsSet);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.set(p.number());

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
            fc.property(fc.nat({ max: 15 }), fc.array(fc.float({ noNaN: true }), { maxLength: 30 }), (bound, data) => {
                const dataAsSet = new Set(data);
                const schema = p.set(p.number()).min(bound);
                const result = schema.safeParse(dataAsSet);
                if (dataAsSet.size >= bound) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Set<number>>;
                        expect(result.value).toBe(dataAsSet);
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
            }),
        );
    });

    it('reports only the size issue when a too-small set also has invalid elements', () => {
        const schema = p.set(p.number()).min(3);
        const result = schema.safeParse(new Set(['bad', 'worse']));
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('rejects invalid bounds', () => {
        expect(() => p.set(p.string()).min(Number.NaN)).toThrow();
        expect(() => p.set(p.string()).min(-1)).toThrow();
        expect(() => p.set(p.string()).min(1.5)).toThrow();
        expect(() => p.set(p.string()).min(Number.POSITIVE_INFINITY)).toThrow();
        expect(() => p.set(p.string()).min(0)).not.toThrow();
    });

    it('is immutable', () => {
        const original = p.set(p.string());
        const modified = original.min(3);
        expect(modified).not.toEqual(original);
        const branched = modified.max(10);
        expect(branched).not.toEqual(modified);
    });
});

describe('max', () => {
    it('accepts in-range and rejects out-of-range values for any bound', () => {
        fc.assert(
            fc.property(fc.nat({ max: 15 }), fc.array(fc.float({ noNaN: true }), { maxLength: 30 }), (bound, data) => {
                const dataAsSet = new Set(data);
                const schema = p.set(p.number()).max(bound);
                const result = schema.safeParse(dataAsSet);
                if (dataAsSet.size <= bound) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Set<number>>;
                        expect(result.value).toBe(dataAsSet);
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
            }),
        );
    });

    it('reports only the size issue when a too-large set also has invalid elements', () => {
        const schema = p.set(p.number()).max(1);
        const result = schema.safeParse(new Set([1, 'bad', 'worse']));
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: 'too_long' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('rejects invalid bounds', () => {
        expect(() => p.set(p.string()).max(Number.NaN)).toThrow();
        expect(() => p.set(p.string()).max(-1)).toThrow();
        expect(() => p.set(p.string()).max(1.5)).toThrow();
        expect(() => p.set(p.string()).max(Number.POSITIVE_INFINITY)).toThrow();
        expect(() => p.set(p.string()).max(0)).not.toThrow();
    });

    it('is immutable', () => {
        const original = p.set(p.string());
        const modified = original.max(3);
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

describe('size', () => {
    it('accepts a set whose size equals the bound', () => {
        fc.assert(
            fc.property(fc.array(fc.float({ noNaN: true }), { maxLength: 30 }), (data) => {
                const dataAsSet = new Set(data);
                const schema = p.set(p.number()).size(dataAsSet.size);
                const result = schema.safeParse(dataAsSet);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Set<number>>;
                    expect(result.value).toBe(dataAsSet);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects a larger set as too_long', () => {
        fc.assert(
            fc.property(fc.array(fc.float({ noNaN: true }), { maxLength: 30 }), fc.nat({ max: 30 }), (data, bound) => {
                const dataAsSet = new Set(data);
                fc.pre(dataAsSet.size > bound);
                const schema = p.set(p.number()).size(bound);
                const result = schema.safeParse(dataAsSet);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_long' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('rejects a smaller set as too_short', () => {
        fc.assert(
            fc.property(fc.array(fc.float({ noNaN: true }), { maxLength: 30 }), fc.nat({ max: 30 }), (data, bound) => {
                const dataAsSet = new Set(data);
                fc.pre(dataAsSet.size < bound);
                const schema = p.set(p.number()).size(bound);
                const result = schema.safeParse(dataAsSet);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('rejects invalid bounds', () => {
        expect(() => p.set(p.string()).size(Number.NaN)).toThrow();
        expect(() => p.set(p.string()).size(-1)).toThrow();
        expect(() => p.set(p.string()).size(1.5)).toThrow();
        expect(() => p.set(p.string()).size(Number.POSITIVE_INFINITY)).toThrow();
        expect(() => p.set(p.string()).size(0)).not.toThrow();
    });

    it('is immutable', () => {
        const original = p.set(p.string());
        const modified = original.size(3);
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

it('rejects when transform produces duplicate keys', () => {
    const lower = p.string().chain(p.string(), (value) => p.ok(value.toLowerCase()));
    const schema = p.set(lower);
    const data = new Set(['A', 'a']);

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'duplicate_key' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('rejects invalid elements', () => {
    const schema = p.set(p.number());
    const data = new Set([1, 'foo', 2, 'bar']);

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
    const schema = p.set(p.object({ foo: p.string() }).strip());
    const data = new Set([{ foo: 'bar', extra: 'baz' }]);

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual(new Set([{ foo: 'bar' }]));
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('preserves unmodified elements before a modified element', () => {
    const schema = p.set(p.object({ foo: p.string() }).strip());
    const data = new Set([{ foo: 'a' }, { foo: 'b' }, { foo: 'c', extra: 'strip me' }]);

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual(new Set([{ foo: 'a' }, { foo: 'b' }, { foo: 'c' }]));
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('preserves unmodified elements after a modified element', () => {
    const schema = p.set(p.object({ foo: p.string() }).strip());
    const data = new Set([{ foo: 'a', extra: 'strip me' }, { foo: 'b' }, { foo: 'c' }]);

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual(new Set([{ foo: 'a' }, { foo: 'b' }, { foo: 'c' }]));
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('reports invalid elements after a modified element', () => {
    const schema = p.set(p.object({ foo: p.string() }).strip());
    const data = new Set([{ foo: 'a', extra: 'strip me' }, 'invalid']);

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [1], message: 'invalid_type' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('accepts optional values', () => {
    const schema = p.set(p.number()).optional();

    fc.assert(
        fc.property(fc.option(fc.array(fc.float({ noNaN: true })), { nil: undefined }), (data) => {
            const dataAsSet = new Set(data);

            const result = schema.safeParse(dataAsSet);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Set<number> | undefined>;
                expect(result.value).toEqual(dataAsSet);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.set(p.number()).nullable();

    fc.assert(
        fc.property(fc.option(fc.array(fc.float({ noNaN: true })), { nil: null }), (data) => {
            const dataAsSet = new Set(data);

            const result = schema.safeParse(dataAsSet);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Set<number> | null>;
                expect(result.value).toEqual(dataAsSet);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
