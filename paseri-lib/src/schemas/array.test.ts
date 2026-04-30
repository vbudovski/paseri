import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts valid types', () => {
    const schema = p.array(p.number())();

    fc.assert(
        fc.property(fc.array(fc.float({ noNaN: true })), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number[]>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.array(p.number())();

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

describe('min', () => {
    it('accepts valid values', () => {
        const schema = p.array(p.number())(p.minLength(3));

        fc.assert(
            fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 3 }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number[]>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.array(p.number())(p.minLength(3));

        fc.assert(
            fc.property(fc.array(fc.float({ noNaN: true }), { maxLength: 2 }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('throws on NaN', () => {
        expect(() => p.minLength(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.array(p.string())();
        const modified = p.array(p.string())(p.minLength(3));
        expect(modified).not.toEqual(original);
        const branched = p.array(p.string())(p.minLength(3), p.maxLength(10));
        expect(branched).not.toEqual(modified);
    });
});

describe('max', () => {
    it('accepts valid values', () => {
        const schema = p.array(p.number())(p.maxLength(3));

        fc.assert(
            fc.property(fc.array(fc.float({ noNaN: true }), { maxLength: 3 }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number[]>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.array(p.number())(p.maxLength(3));

        fc.assert(
            fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 4 }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_long' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('throws on NaN', () => {
        expect(() => p.maxLength(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.array(p.string())();
        const modified = p.array(p.string())(p.maxLength(3));
        expect(modified).not.toEqual(original);
        const branched = p.array(p.string())(p.maxLength(3), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('length', () => {
    it('accepts valid values', () => {
        const schema = p.array(p.number())(p.minLength(3), p.maxLength(3));

        fc.assert(
            fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 3, maxLength: 3 }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number[]>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects values that are too long', () => {
        const schema = p.array(p.number())(p.minLength(3), p.maxLength(3));

        fc.assert(
            fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 4 }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_long' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('rejects values that are too short', () => {
        const schema = p.array(p.number())(p.minLength(3), p.maxLength(3));

        fc.assert(
            fc.property(fc.array(fc.float({ noNaN: true }), { maxLength: 2 }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('throws on NaN', () => {
        expect(() => p.minLength(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.array(p.string())();
        const modified = p.array(p.string())(p.minLength(3), p.maxLength(3));
        expect(modified).not.toEqual(original);
        const branched = p.array(p.string())(p.minLength(3), p.maxLength(3), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

it('rejects invalid elements', () => {
    const schema = p.array(p.number())();
    const data = [1, 'foo', 2, 'bar'];

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

it('rejects invalid nested elements', () => {
    const schema = p.array(p.array(p.number())())();
    const data = [[1], [2, 'foo'], [3], 'bar'];
    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([
            { path: [1, 1], message: 'invalid_type' },
            { path: [3], message: 'invalid_type' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('accepts optional values', () => {
    const schema = p.optional(p.array(p.number())());

    fc.assert(
        fc.property(fc.option(fc.array(fc.float({ noNaN: true })), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number[] | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.nullable(p.array(p.number())());

    fc.assert(
        fc.property(fc.option(fc.array(fc.float({ noNaN: true })), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number[] | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('returns new value when child is modified', () => {
    const schema = p.array(p.object({ foo: p.string() }).strip())();
    const data = [{ foo: 'bar', extra: 'baz' }];

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual([{ foo: 'bar' }]);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('preserves unmodified elements before a modified element', () => {
    const schema = p.array(p.object({ foo: p.string() }).strip())();
    const data = [{ foo: 'a' }, { foo: 'b' }, { foo: 'c', extra: 'strip me' }];

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual([{ foo: 'a' }, { foo: 'b' }, { foo: 'c' }]);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('preserves unmodified elements after a modified element', () => {
    const schema = p.array(p.object({ foo: p.string() }).strip())();
    const data = [{ foo: 'a', extra: 'strip me' }, { foo: 'b' }, { foo: 'c' }];

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual([{ foo: 'a' }, { foo: 'b' }, { foo: 'c' }]);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('reports invalid elements after a modified element', () => {
    const schema = p.array(p.object({ foo: p.string() }).strip())();
    const data = [{ foo: 'a', extra: 'strip me' }, 'invalid'];

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [1], message: 'invalid_type' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});
