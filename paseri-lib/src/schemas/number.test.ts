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
        const schema = p.number().gte(10);

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
        const schema = p.number().gte(10);

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
        expect(() => p.number().gte(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.number();
        const modified = original.gte(3);
        expect(modified).not.toEqual(original);
        const branched = modified.lte(10);
        expect(branched).not.toEqual(modified);
    });
});

describe('gt', () => {
    it('accepts valid values', () => {
        const schema = p.number().gt(10);

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
        const schema = p.number().gt(10);

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
        expect(() => p.number().gt(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.number();
        const modified = original.gt(3);
        expect(modified).not.toEqual(original);
        const branched = modified.lt(10);
        expect(branched).not.toEqual(modified);
    });
});

describe('lte', () => {
    it('accepts valid values', () => {
        const schema = p.number().lte(10);

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
        const schema = p.number().lte(10);

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
        expect(() => p.number().lte(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.number();
        const modified = original.lte(3);
        expect(modified).not.toEqual(original);
        const branched = modified.gte(0);
        expect(branched).not.toEqual(modified);
    });
});

describe('lt', () => {
    it('accepts valid values', () => {
        const schema = p.number().lt(10);

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
        const schema = p.number().lt(10);

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
        expect(() => p.number().lt(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.number();
        const modified = original.lt(3);
        expect(modified).not.toEqual(original);
        const branched = modified.gt(0);
        expect(branched).not.toEqual(modified);
    });
});

describe('int', () => {
    it('accepts valid values', () => {
        const schema = p.number().int();

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
        const schema = p.number().int();

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
        const modified = original.int();
        expect(modified).not.toEqual(original);
        const branched = modified.gte(0);
        expect(branched).not.toEqual(modified);
    });
});

describe('finite', () => {
    it('accepts valid values', () => {
        const schema = p.number().finite();

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
        const schema = p.number().finite();

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
        const modified = original.finite();
        expect(modified).not.toEqual(original);
        const branched = modified.gte(0);
        expect(branched).not.toEqual(modified);
    });
});

describe('safe', () => {
    it('accepts valid values', () => {
        const schema = p.number().safe();

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
        const schema = p.number().safe();

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
        const modified = original.safe();
        expect(modified).not.toEqual(original);
        const branched = modified.gte(0);
        expect(branched).not.toEqual(modified);
    });
});

it('accepts optional values', () => {
    const schema = p.number().optional();

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
    const schema = p.number().nullable();

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
