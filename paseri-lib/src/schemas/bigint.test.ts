import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts valid types', () => {
    const schema = p.bigint();

    fc.assert(
        fc.property(fc.bigInt(), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<bigint>();
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.bigint();

    fc.assert(
        fc.property(
            fc.anything().filter((value) => typeof value !== 'bigint'),
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
// comparison the schema uses. bigint comparisons are exact, so the derived predicate never disagrees with the
// schema, and negatives fall out of the generator without separate cases.
const boundChecks: readonly {
    readonly name: 'gte' | 'gt' | 'lte' | 'lt';
    readonly apply: (schema: ReturnType<typeof p.bigint>, bound: bigint) => ReturnType<typeof p.bigint>;
    readonly accepts: (value: bigint, bound: bigint) => boolean;
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
                fc.property(fc.bigInt(), fc.bigInt(), (bound, value) => {
                    const schema = check.apply(p.bigint(), bound);
                    const result = schema.safeParse(value);
                    if (check.accepts(value, bound)) {
                        if (result.ok) {
                            expectTypeOf(result.value).toEqualTypeOf<bigint>();
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
                }),
            );
        });

        it('is immutable', () => {
            const original = p.bigint();
            const modified = check.apply(original, 3n);
            expect(modified).not.toEqual(original);
        });
    });
}

it('accepts optional values', () => {
    const schema = p.bigint().optional();

    fc.assert(
        fc.property(fc.option(fc.bigInt(), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<bigint | undefined>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.bigint().nullable();

    fc.assert(
        fc.property(fc.option(fc.bigInt(), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<bigint | null>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
