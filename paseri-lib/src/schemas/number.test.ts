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
                expectTypeOf(result.value).toEqualTypeOf<number>();
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

// Each bound is exercised over a generated (bound, value) pair, deriving the expected outcome from the same
// comparison the schema uses. This subsumes fixed-bound and negative-bound cases — negatives fall out of the
// generator. `>=`/`>`/`<=`/`<` are exact at the boundary, so the derived predicate never disagrees with the schema.
const boundChecks: readonly {
    readonly name: 'gte' | 'gt' | 'lte' | 'lt';
    readonly apply: (schema: ReturnType<typeof p.number>, bound: number) => ReturnType<typeof p.number>;
    readonly accepts: (value: number, bound: number) => boolean;
    readonly code: 'too_small' | 'too_large';
}[] = [
    {
        name: 'gte',
        apply: (schema, bound) => schema.gte(bound),
        accepts: (value, bound) => value >= bound,
        code: 'too_small',
    },
    {
        name: 'gt',
        apply: (schema, bound) => schema.gt(bound),
        accepts: (value, bound) => value > bound,
        code: 'too_small',
    },
    {
        name: 'lte',
        apply: (schema, bound) => schema.lte(bound),
        accepts: (value, bound) => value <= bound,
        code: 'too_large',
    },
    {
        name: 'lt',
        apply: (schema, bound) => schema.lt(bound),
        accepts: (value, bound) => value < bound,
        code: 'too_large',
    },
];

for (const check of boundChecks) {
    describe(check.name, () => {
        it('accepts in-range and rejects out-of-range values for any bound', () => {
            fc.assert(
                // The bound excludes infinities (a ±Infinity bound is degenerate); the value does not — ±Infinity
                // is a valid number input and exercises the open ends of the comparison.
                fc.property(
                    fc.float({ noNaN: true, noDefaultInfinity: true }),
                    fc.float({ noNaN: true }),
                    (bound, value) => {
                        const schema = check.apply(p.number(), bound);
                        const result = schema.safeParse(value);
                        if (check.accepts(value, bound)) {
                            if (result.ok) {
                                expectTypeOf(result.value).toEqualTypeOf<number>();
                                expect(result.value).toBe(value);
                            } else {
                                expect(result.ok).toBeTruthy();
                            }
                        } else {
                            if (!result.ok) {
                                expect(result.messages()).toEqual([{ path: [], message: check.code }]);
                            } else {
                                expect(result.ok).toBeFalsy();
                            }
                        }
                    },
                ),
            );
        });

        it('throws on NaN boundary', () => {
            expect(() => check.apply(p.number(), Number.NaN)).toThrow();
        });

        it('is immutable', () => {
            const original = p.number();
            const modified = check.apply(original, 3);
            expect(modified).not.toEqual(original);
        });
    });
}

describe('contradictory bounds', () => {
    it('throws when the lower bound exceeds the upper bound', () => {
        // ±Infinity are valid number inputs, so they are valid bounds; an interval whose emptiness hinges on a
        // ±Infinity bound must throw like any finite empty interval. These cases previously built a silent
        // reject-all schema, because the effective-bound helpers used ±Infinity as the "no bound" sentinel.
        const emptyOverReals = [
            () => p.number().gte(5).lte(3),
            () => p.number().lte(3).gte(5),
            () => p.number().gt(5).lt(5),
            () => p.number().gte(5).lt(5),
            () => p.number().gte(Number.NEGATIVE_INFINITY).lt(Number.NEGATIVE_INFINITY),
            () => p.number().gt(Number.NEGATIVE_INFINITY).lt(Number.NEGATIVE_INFINITY),
            () => p.number().gt(Number.NEGATIVE_INFINITY).lte(Number.NEGATIVE_INFINITY),
            () => p.number().lte(Number.POSITIVE_INFINITY).gt(Number.POSITIVE_INFINITY),
            () => p.number().lt(Number.POSITIVE_INFINITY).gt(Number.POSITIVE_INFINITY),
            () => p.number().lt(Number.POSITIVE_INFINITY).gte(Number.POSITIVE_INFINITY),
        ];
        for (const build of emptyOverReals) {
            expect(build).toThrow('Lower bound must not exceed upper bound.');
        }
    });

    it('allows a single satisfiable value', () => {
        expect(() => p.number().gte(5).lte(5)).not.toThrow();

        // A single-point interval at ±Infinity is satisfiable, not empty — assert it accepts that value, since a
        // bare `not.toThrow` would also pass for the old silent reject-all schema.
        const negativeInfinityOnly = p.number().gte(Number.NEGATIVE_INFINITY).lte(Number.NEGATIVE_INFINITY);
        expect(negativeInfinityOnly.safeParse(Number.NEGATIVE_INFINITY).ok).toBeTruthy();
        expect(negativeInfinityOnly.safeParse(0).ok).toBeFalsy();

        const positiveInfinityOnly = p.number().lte(Number.POSITIVE_INFINITY).gte(Number.POSITIVE_INFINITY);
        expect(positiveInfinityOnly.safeParse(Number.POSITIVE_INFINITY).ok).toBeTruthy();
        expect(positiveInfinityOnly.safeParse(0).ok).toBeFalsy();
    });

    it('allows an integer-gap range that is empty only over the reals', () => {
        expect(() => p.number().gt(5).lt(6).int()).not.toThrow();
    });
});

describe('int', () => {
    it('accepts valid values', () => {
        const schema = p.number().int();

        fc.assert(
            fc.property(fc.integer(), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number>();
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
                    expectTypeOf(result.value).toEqualTypeOf<number>();
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
                    expectTypeOf(result.value).toEqualTypeOf<number>();
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
                expectTypeOf(result.value).toEqualTypeOf<number | undefined>();
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
                expectTypeOf(result.value).toEqualTypeOf<number | null>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
