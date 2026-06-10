import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

// Spans the full Instant range so bounds checks see pre-epoch values and sub-millisecond differences.
const instantArb = fc
    .bigInt({ min: -8_640_000_000_000_000_000_000n, max: 8_640_000_000_000_000_000_000n })
    .map((epochNanoseconds) => Temporal.Instant.fromEpochNanoseconds(epochNanoseconds));

it('accepts valid types', () => {
    const schema = p.instant();

    fc.assert(
        fc.property(instantArb, (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.Instant>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.instant();

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
    const boundary = Temporal.Instant.from('2020-01-01T00:00:00Z');

    it('accepts at-or-after the bound, rejects before it as too_dated', () => {
        fc.assert(
            fc.property(instantArb, instantArb, (bound, value) => {
                const result = p.instant().min(bound).safeParse(value);
                if (Temporal.Instant.compare(value, bound) >= 0) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.Instant>;
                        expect(result.value).toBe(value);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                } else {
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'too_dated' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                }
            }),
            // Seed the exact-boundary case (value equal to the bound): it alone distinguishes an inclusive bound from
            // an exclusive one, and random instants across a ~130-year span never land on it.
            { examples: [[boundary, Temporal.Instant.fromEpochNanoseconds(boundary.epochNanoseconds)]] },
        );
    });

    it('is immutable', () => {
        const original = p.instant();
        const modified = original.min(boundary);
        expect(modified).not.toEqual(original);
        const branched = modified.max(Temporal.Instant.from('2025-01-01T00:00:00Z'));
        expect(branched).not.toEqual(modified);
    });
});

describe('max', () => {
    const boundary = Temporal.Instant.from('2020-01-01T00:00:00Z');

    it('accepts at-or-before the bound, rejects after it as too_recent', () => {
        fc.assert(
            fc.property(instantArb, instantArb, (bound, value) => {
                const result = p.instant().max(bound).safeParse(value);
                if (Temporal.Instant.compare(value, bound) <= 0) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.Instant>;
                        expect(result.value).toBe(value);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                } else {
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'too_recent' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                }
            }),
            { examples: [[boundary, Temporal.Instant.fromEpochNanoseconds(boundary.epochNanoseconds)]] },
        );
    });

    it('is immutable', () => {
        const original = p.instant();
        const modified = original.max(boundary);
        expect(modified).not.toEqual(original);
        const branched = modified.min(Temporal.Instant.from('2010-01-01T00:00:00Z'));
        expect(branched).not.toEqual(modified);
    });
});

it('accepts optional values', () => {
    const schema = p.instant().optional();

    fc.assert(
        fc.property(fc.option(instantArb, { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.Instant | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.instant().nullable();

    fc.assert(
        fc.property(fc.option(instantArb, { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.Instant | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
