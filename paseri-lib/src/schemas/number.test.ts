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
                                expectTypeOf(result.value).toEqualTypeOf<number>;
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
