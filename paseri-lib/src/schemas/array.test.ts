import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts valid types', () => {
    const schema = p.array(p.number());

    fc.assert(
        fc.property(fc.array(fc.float({ noNaN: true })), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number[]>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.array(p.number());

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
    it('accepts in-range and rejects out-of-range values for any bound', () => {
        fc.assert(
            fc.property(fc.nat({ max: 15 }), fc.array(fc.float({ noNaN: true }), { maxLength: 30 }), (bound, data) => {
                const schema = p.array(p.number()).min(bound);
                const result = schema.safeParse(data);
                if (data.length >= bound) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<number[]>();
                        expect(result.value).toBe(data);
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

    it('reports only the length issue when a too-short array also has invalid elements', () => {
        const schema = p.array(p.number()).min(3);
        const result = schema.safeParse(['bad', 'worse']);
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('rejects invalid bounds', () => {
        expect(() => p.array(p.string()).min(Number.NaN)).toThrow();
        expect(() => p.array(p.string()).min(-1)).toThrow();
        expect(() => p.array(p.string()).min(1.5)).toThrow();
        expect(() => p.array(p.string()).min(Number.POSITIVE_INFINITY)).toThrow();
        expect(() => p.array(p.string()).min(0)).not.toThrow();
    });

    it('is immutable', () => {
        const original = p.array(p.string());
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
                const schema = p.array(p.number()).max(bound);
                const result = schema.safeParse(data);
                if (data.length <= bound) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<number[]>();
                        expect(result.value).toBe(data);
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

    it('reports only the length issue when a too-long array also has invalid elements', () => {
        const schema = p.array(p.number()).max(1);
        const result = schema.safeParse([1, 'bad', 'worse']);
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: 'too_long' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('rejects invalid bounds', () => {
        expect(() => p.array(p.string()).max(Number.NaN)).toThrow();
        expect(() => p.array(p.string()).max(-1)).toThrow();
        expect(() => p.array(p.string()).max(1.5)).toThrow();
        expect(() => p.array(p.string()).max(Number.POSITIVE_INFINITY)).toThrow();
        expect(() => p.array(p.string()).max(0)).not.toThrow();
    });

    it('is immutable', () => {
        const original = p.array(p.string());
        const modified = original.max(3);
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

describe('length', () => {
    it('accepts an array whose length equals the bound', () => {
        fc.assert(
            fc.property(fc.array(fc.float({ noNaN: true }), { maxLength: 30 }), (data) => {
                const schema = p.array(p.number()).length(data.length);
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number[]>();
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects a longer array as too_long', () => {
        fc.assert(
            fc.property(fc.array(fc.float({ noNaN: true }), { maxLength: 30 }), fc.nat({ max: 30 }), (data, bound) => {
                fc.pre(data.length > bound);
                const schema = p.array(p.number()).length(bound);
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_long' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('rejects a shorter array as too_short', () => {
        fc.assert(
            fc.property(fc.array(fc.float({ noNaN: true }), { maxLength: 30 }), fc.nat({ max: 30 }), (data, bound) => {
                fc.pre(data.length < bound);
                const schema = p.array(p.number()).length(bound);
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('rejects invalid bounds', () => {
        expect(() => p.array(p.string()).length(Number.NaN)).toThrow();
        expect(() => p.array(p.string()).length(-1)).toThrow();
        expect(() => p.array(p.string()).length(1.5)).toThrow();
        expect(() => p.array(p.string()).length(Number.POSITIVE_INFINITY)).toThrow();
        expect(() => p.array(p.string()).length(0)).not.toThrow();
    });

    it('is immutable', () => {
        const original = p.array(p.string());
        const modified = original.length(3);
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

it('rejects invalid elements', () => {
    const schema = p.array(p.number());
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
    const schema = p.array(p.array(p.number()));
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
    const schema = p.array(p.number()).optional();

    fc.assert(
        fc.property(fc.option(fc.array(fc.float({ noNaN: true })), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number[] | undefined>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.array(p.number()).nullable();

    fc.assert(
        fc.property(fc.option(fc.array(fc.float({ noNaN: true })), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number[] | null>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('returns new value when child is modified', () => {
    const schema = p.array(p.object({ foo: p.string() }).strip());
    const data = [{ foo: 'bar', extra: 'baz' }];

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual([{ foo: 'bar' }]);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('preserves unmodified elements before a modified element', () => {
    const schema = p.array(p.object({ foo: p.string() }).strip());
    const data = [{ foo: 'a' }, { foo: 'b' }, { foo: 'c', extra: 'strip me' }];

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual([{ foo: 'a' }, { foo: 'b' }, { foo: 'c' }]);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('preserves unmodified elements after a modified element', () => {
    const schema = p.array(p.object({ foo: p.string() }).strip());
    const data = [{ foo: 'a', extra: 'strip me' }, { foo: 'b' }, { foo: 'c' }];

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual([{ foo: 'a' }, { foo: 'b' }, { foo: 'c' }]);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('reports invalid elements after a modified element', () => {
    const schema = p.array(p.object({ foo: p.string() }).strip());
    const data = [{ foo: 'a', extra: 'strip me' }, 'invalid'];

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [1], message: 'invalid_type' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});
