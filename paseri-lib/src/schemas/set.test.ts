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
                expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected Set.' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

describe('min', () => {
    it('accepts valid values', () => {
        const schema = p.set(p.number()).min(3);

        fc.assert(
            fc.property(
                fc.array(fc.float({ noNaN: true }), { minLength: 3 }).filter((value) => new Set(value).size >= 3),
                (data) => {
                    const dataAsSet = new Set(data);

                    const result = schema.safeParse(dataAsSet);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Set<number>>;
                        expect(result.value).toBe(dataAsSet);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.set(p.number()).min(3);

        fc.assert(
            fc.property(
                fc.array(fc.float({ noNaN: true }), { maxLength: 2 }).filter((value) => new Set(value).size <= 2),
                (data) => {
                    const dataAsSet = new Set(data);

                    const result = schema.safeParse(dataAsSet);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'Too short.' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('rejects when transformation causes deduplication below minimum', () => {
        const lower = p.string().chain(p.string(), (value) => p.ok(value.toLowerCase()));
        const schema = p.set(lower).min(2);
        const data = new Set(['A', 'a']); // size 2, but both lowercase to "a" → size 1

        const result = schema.safeParse(data);
        expect(result.ok).toBe(false);
    });

    it('throws on NaN', () => {
        expect(() => p.set(p.string()).min(NaN)).toThrow();
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
    it('accepts valid values', () => {
        const schema = p.set(p.number()).max(3);

        fc.assert(
            fc.property(
                fc.array(fc.float({ noNaN: true }), { maxLength: 3 }).filter((value) => new Set(value).size <= 3),
                (data) => {
                    const dataAsSet = new Set(data);

                    const result = schema.safeParse(dataAsSet);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Set<number>>;
                        expect(result.value).toBe(dataAsSet);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.set(p.number()).max(3);

        fc.assert(
            fc.property(
                fc.array(fc.float({ noNaN: true }), { minLength: 4 }).filter((value) => new Set(value).size >= 4),
                (data) => {
                    const dataAsSet = new Set(data);

                    const result = schema.safeParse(dataAsSet);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'Too long.' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('throws on NaN', () => {
        expect(() => p.set(p.string()).max(NaN)).toThrow();
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
    it('accepts valid values', () => {
        const schema = p.set(p.number()).size(3);

        fc.assert(
            fc.property(
                fc
                    .array(fc.float({ noNaN: true }), { minLength: 3, maxLength: 3 })
                    .filter((value) => new Set(value).size === 3),
                (data) => {
                    const dataAsSet = new Set(data);

                    const result = schema.safeParse(dataAsSet);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Set<number>>;
                        expect(result.value).toBe(dataAsSet);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects values that are too long', () => {
        const schema = p.set(p.number()).size(3);

        fc.assert(
            fc.property(
                fc.array(fc.float({ noNaN: true }), { minLength: 4 }).filter((value) => new Set(value).size >= 4),
                (data) => {
                    const dataAsSet = new Set(data);

                    const result = schema.safeParse(dataAsSet);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'Too long.' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('rejects values that are too short', () => {
        const schema = p.set(p.number()).size(3);

        fc.assert(
            fc.property(
                fc.array(fc.float({ noNaN: true }), { maxLength: 2 }).filter((value) => new Set(value).size <= 2),
                (data) => {
                    const dataAsSet = new Set(data);

                    const result = schema.safeParse(dataAsSet);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'Too short.' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('rejects when transformation causes deduplication below exact size', () => {
        const lower = p.string().chain(p.string(), (value) => p.ok(value.toLowerCase()));
        const schema = p.set(lower).size(2);
        const data = new Set(['A', 'a']); // size 2, but both lowercase to "a" → size 1

        const result = schema.safeParse(data);
        expect(result.ok).toBe(false);
    });

    it('throws on NaN', () => {
        expect(() => p.set(p.string()).size(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.set(p.string());
        const modified = original.size(3);
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

it('rejects invalid elements', () => {
    const schema = p.set(p.number());
    const data = new Set([1, 'foo', 2, 'bar']);

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([
            { path: [1], message: 'Invalid type. Expected number.' },
            { path: [3], message: 'Invalid type. Expected number.' },
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
        expect(result.messages()).toEqual([{ path: [1], message: 'Invalid type. Expected object.' }]);
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
