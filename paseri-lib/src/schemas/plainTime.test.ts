import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

// Covers every field down to the nanosecond. PlainTime has no calendar, so the fast path always uses the
// lexicographic field compare; this pins it to Temporal.PlainTime.compare across the full sub-second range.
const plainTimeArb = fc
    .record({
        hour: fc.integer({ min: 0, max: 23 }),
        minute: fc.integer({ min: 0, max: 59 }),
        second: fc.integer({ min: 0, max: 59 }),
        millisecond: fc.integer({ min: 0, max: 999 }),
        microsecond: fc.integer({ min: 0, max: 999 }),
        nanosecond: fc.integer({ min: 0, max: 999 }),
    })
    .map((fields) => Temporal.PlainTime.from(fields));

it('accepts valid types', () => {
    const schema = p.plainTime();

    fc.assert(
        fc.property(plainTimeArb, (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainTime>();
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.plainTime();

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
    const boundary = Temporal.PlainTime.from('12:00:00');

    it('accepts at-or-after the bound, rejects before it as too_dated', () => {
        fc.assert(
            fc.property(plainTimeArb, plainTimeArb, (bound, value) => {
                const result = p.plainTime().min(bound).safeParse(value);
                if (Temporal.PlainTime.compare(value, bound) >= 0) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainTime>();
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
            // an exclusive one, and random nanosecond-resolution times never land on it.
            { examples: [[boundary, Temporal.PlainTime.from('12:00:00')]] },
        );
    });

    it('is immutable', () => {
        const original = p.plainTime();
        const modified = original.min(boundary);
        expect(modified).not.toEqual(original);
        const branched = modified.max(Temporal.PlainTime.from('18:00:00'));
        expect(branched).not.toEqual(modified);
    });
});

describe('max', () => {
    const boundary = Temporal.PlainTime.from('12:00:00');

    it('accepts at-or-before the bound, rejects after it as too_recent', () => {
        fc.assert(
            fc.property(plainTimeArb, plainTimeArb, (bound, value) => {
                const result = p.plainTime().max(bound).safeParse(value);
                if (Temporal.PlainTime.compare(value, bound) <= 0) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainTime>();
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
            { examples: [[boundary, Temporal.PlainTime.from('12:00:00')]] },
        );
    });

    it('is immutable', () => {
        const original = p.plainTime();
        const modified = original.max(boundary);
        expect(modified).not.toEqual(original);
        const branched = modified.min(Temporal.PlainTime.from('06:00:00'));
        expect(branched).not.toEqual(modified);
    });
});

it('accepts optional values', () => {
    const schema = p.plainTime().optional();

    fc.assert(
        fc.property(fc.option(plainTimeArb, { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainTime | undefined>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.plainTime().nullable();

    fc.assert(
        fc.property(fc.option(plainTimeArb, { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainTime | null>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
