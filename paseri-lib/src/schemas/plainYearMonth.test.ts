import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

// Spans the full ISO year range and every built-in calendar. PlainYearMonth exposes no day getter, so the fast
// path compares year/month only — exact against Temporal.PlainYearMonth.compare when both sides are iso8601
// (reference day 1); non-iso8601 values defer to compare.
const calendars = [
    'iso8601',
    'gregory',
    'hebrew',
    'islamic-umalqura',
    'indian',
    'persian',
    'buddhist',
    'japanese',
    'chinese',
    'coptic',
    'ethiopic',
    'roc',
    'dangi',
];
const plainYearMonthArb = fc
    .record({
        year: fc.integer({ min: -5000, max: 9999 }),
        month: fc.integer({ min: 1, max: 12 }),
        calendar: fc.constantFrom(...calendars),
    })
    .map(({ year, month, calendar }) =>
        Temporal.PlainDate.from({ year, month, day: 1 }).withCalendar(calendar).toPlainYearMonth(),
    );

it('accepts valid types', () => {
    const schema = p.plainYearMonth();

    fc.assert(
        fc.property(plainYearMonthArb, (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainYearMonth>();
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.plainYearMonth();

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
    const boundary = Temporal.PlainYearMonth.from('2020-01');

    it('accepts at-or-after the bound, rejects before it as too_dated', () => {
        fc.assert(
            fc.property(plainYearMonthArb, plainYearMonthArb, (bound, value) => {
                const result = p.plainYearMonth().min(bound).safeParse(value);
                if (Temporal.PlainYearMonth.compare(value, bound) >= 0) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainYearMonth>();
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
            // Seed the exact-boundary case in a different calendar than the bound: compare ties at 0 (ordering is
            // calendar-independent), pinning both the inclusive bound and that the cross-calendar path agrees.
            {
                examples: [
                    [
                        Temporal.PlainYearMonth.from('2020-01'),
                        Temporal.PlainDate.from('2020-01-01').withCalendar('japanese').toPlainYearMonth(),
                    ],
                ],
            },
        );
    });

    it('is immutable', () => {
        const original = p.plainYearMonth();
        const modified = original.min(boundary);
        expect(modified).not.toEqual(original);
        const branched = modified.max(Temporal.PlainYearMonth.from('2025-12'));
        expect(branched).not.toEqual(modified);
    });
});

describe('max', () => {
    const boundary = Temporal.PlainYearMonth.from('2020-01');

    it('accepts at-or-before the bound, rejects after it as too_recent', () => {
        fc.assert(
            fc.property(plainYearMonthArb, plainYearMonthArb, (bound, value) => {
                const result = p.plainYearMonth().max(bound).safeParse(value);
                if (Temporal.PlainYearMonth.compare(value, bound) <= 0) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainYearMonth>();
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
            {
                examples: [
                    [
                        Temporal.PlainYearMonth.from('2020-01'),
                        Temporal.PlainDate.from('2020-01-01').withCalendar('japanese').toPlainYearMonth(),
                    ],
                ],
            },
        );
    });

    it('is immutable', () => {
        const original = p.plainYearMonth();
        const modified = original.max(boundary);
        expect(modified).not.toEqual(original);
        const branched = modified.min(Temporal.PlainYearMonth.from('2010-01'));
        expect(branched).not.toEqual(modified);
    });
});

describe('contradictory bounds', () => {
    const lower = Temporal.PlainYearMonth.from('2020-01');
    const upper = Temporal.PlainYearMonth.from('2019-01');

    it('throws when the minimum exceeds the maximum', () => {
        expect(() => p.plainYearMonth().min(lower).max(upper)).toThrow('Minimum must not exceed maximum.');
        expect(() => p.plainYearMonth().max(upper).min(lower)).toThrow('Minimum must not exceed maximum.');
    });

    it('allows equal minimum and maximum', () => {
        expect(() => p.plainYearMonth().min(lower).max(lower)).not.toThrow();
    });
});

it('accepts optional values', () => {
    const schema = p.plainYearMonth().optional();

    fc.assert(
        fc.property(fc.option(plainYearMonthArb, { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainYearMonth | undefined>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.plainYearMonth().nullable();

    fc.assert(
        fc.property(fc.option(plainYearMonthArb, { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainYearMonth | null>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
