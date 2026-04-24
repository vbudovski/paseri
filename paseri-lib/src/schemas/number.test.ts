import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts valid types', () => {
    const schema = p.number();

    fc.assert(
        fc.property(fc.float({ noNaN: true }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.number();

    fc.assert(
        fc.property(
            fc.oneof(
                fc.anything().filter((value) => typeof value !== 'number'),
                fc.constant(Number.NaN),
            ),
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

describe('gte', () => {
    it('accepts valid values', () => {
        const schema = p.number(p.gte(10));

        fc.assert(
            fc.property(fc.float({ noNaN: true, min: 10 }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.number(p.gte(10));

        fc.assert(
            fc.property(fc.float({ noNaN: true, max: 10, maxExcluded: true }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_small' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('throws on NaN boundary', () => {
        expect(() => p.gte(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.number();
        const modified = p.number(p.gte(3));
        expect(modified).not.toEqual(original);
        const branched = p.number(p.gte(3), p.lte(10));
        expect(branched).not.toEqual(modified);
    });
});

describe('gt', () => {
    it('accepts valid values', () => {
        const schema = p.number(p.gt(10));

        fc.assert(
            fc.property(fc.float({ noNaN: true, min: 10, minExcluded: true }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.number(p.gt(10));

        fc.assert(
            fc.property(fc.float({ noNaN: true, max: 10 }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_small' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('throws on NaN boundary', () => {
        expect(() => p.gt(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.number();
        const modified = p.number(p.gt(3));
        expect(modified).not.toEqual(original);
        const branched = p.number(p.gt(3), p.lt(10));
        expect(branched).not.toEqual(modified);
    });
});

describe('lte', () => {
    it('accepts valid values', () => {
        const schema = p.number(p.lte(10));

        fc.assert(
            fc.property(fc.float({ noNaN: true, max: 10 }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.number(p.lte(10));

        fc.assert(
            fc.property(fc.float({ noNaN: true, min: 10, minExcluded: true }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_large' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('throws on NaN boundary', () => {
        expect(() => p.lte(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.number();
        const modified = p.number(p.lte(3));
        expect(modified).not.toEqual(original);
        const branched = p.number(p.lte(3), p.gte(0));
        expect(branched).not.toEqual(modified);
    });
});

describe('lt', () => {
    it('accepts valid values', () => {
        const schema = p.number(p.lt(10));

        fc.assert(
            fc.property(fc.float({ noNaN: true, max: 10, maxExcluded: true }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.number(p.lt(10));

        fc.assert(
            fc.property(fc.float({ noNaN: true, min: 10 }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_large' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('throws on NaN boundary', () => {
        expect(() => p.lt(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.number();
        const modified = p.number(p.lt(3));
        expect(modified).not.toEqual(original);
        const branched = p.number(p.lt(3), p.gt(0));
        expect(branched).not.toEqual(modified);
    });
});

describe('int', () => {
    it('accepts valid values', () => {
        const schema = p.number(p.int());

        fc.assert(
            fc.property(fc.integer(), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.number(p.int());

        fc.assert(
            fc.property(fc.float({ noNaN: true, noInteger: true }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_integer' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('is immutable', () => {
        const original = p.number();
        const modified = p.number(p.int());
        expect(modified).not.toEqual(original);
        const branched = p.number(p.int(), p.gte(0));
        expect(branched).not.toEqual(modified);
    });
});

describe('finite', () => {
    it('accepts valid values', () => {
        const schema = p.number(p.finite());

        fc.assert(
            fc.property(fc.float({ noNaN: true, noDefaultInfinity: true }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.number(p.finite());

        fc.assert(
            fc.property(
                fc.oneof(fc.constant(Number.POSITIVE_INFINITY), fc.constant(Number.NEGATIVE_INFINITY)),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'invalid_finite' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('is immutable', () => {
        const original = p.number();
        const modified = p.number(p.finite());
        expect(modified).not.toEqual(original);
        const branched = p.number(p.finite(), p.gte(0));
        expect(branched).not.toEqual(modified);
    });
});

describe('safe', () => {
    it('accepts valid values', () => {
        const schema = p.number(p.safeInt());

        fc.assert(
            fc.property(fc.maxSafeInteger(), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.number(p.safeInt());

        fc.assert(
            fc.property(
                fc.oneof(fc.constant(Number.MAX_SAFE_INTEGER + 1), fc.constant(Number.MIN_SAFE_INTEGER - 1)),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'invalid_safe_integer' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('is immutable', () => {
        const original = p.number();
        const modified = p.number(p.safeInt());
        expect(modified).not.toEqual(original);
        const branched = p.number(p.safeInt(), p.gte(0));
        expect(branched).not.toEqual(modified);
    });
});

it('accepts optional values', () => {
    const schema = p.optional(p.number());

    fc.assert(
        fc.property(fc.option(fc.float({ noNaN: true }), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.nullable(p.number());

    fc.assert(
        fc.property(fc.option(fc.float({ noNaN: true }), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
