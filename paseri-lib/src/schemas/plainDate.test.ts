import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

// Spans the full ISO year range and re-expresses each date in every built-in calendar: iso8601 values exercise the
// lexicographic field-compare fast path, while other calendars report divergent .year/.month/.day and defer to
// Temporal.compare. Day caps at 28 so every month is valid.
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
const plainDateArb = fc
    .record({
        year: fc.integer({ min: -5000, max: 9999 }),
        month: fc.integer({ min: 1, max: 12 }),
        day: fc.integer({ min: 1, max: 28 }),
        calendar: fc.constantFrom(...calendars),
    })
    .map(({ year, month, day, calendar }) => Temporal.PlainDate.from({ year, month, day }).withCalendar(calendar));

// Both-ISO [bound, value] pairs walking the ISO fast-path comparison ladder: each rung (year, month, day)
// differs above and below, plus an all-fields-equal pair for the tie terminal. Independent random draws never
// share a field prefix, so these pin every rung directly.
const ladderExamples: [Temporal.PlainDate, Temporal.PlainDate][] = [
    [Temporal.PlainDate.from('2020-06-15'), Temporal.PlainDate.from('2019-06-15')],
    [Temporal.PlainDate.from('2020-06-15'), Temporal.PlainDate.from('2021-06-15')],
    [Temporal.PlainDate.from('2020-06-15'), Temporal.PlainDate.from('2020-05-15')],
    [Temporal.PlainDate.from('2020-06-15'), Temporal.PlainDate.from('2020-07-15')],
    [Temporal.PlainDate.from('2020-06-15'), Temporal.PlainDate.from('2020-06-14')],
    [Temporal.PlainDate.from('2020-06-15'), Temporal.PlainDate.from('2020-06-16')],
    [Temporal.PlainDate.from('2020-06-15'), Temporal.PlainDate.from('2020-06-15')],
];

it('accepts valid types', () => {
    const schema = p.plainDate();

    fc.assert(
        fc.property(plainDateArb, (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDate>();
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.plainDate();

    fc.assert(
        fc.property(fc.anything(), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([
                    {
                        path: [],
                        message: 'invalid_type',
                    },
                ]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

describe('min', () => {
    it('accepts at-or-after the bound, rejects before it as too_dated', () => {
        fc.assert(
            fc.property(plainDateArb, plainDateArb, (bound, value) => {
                const result = p.plainDate().min(bound).safeParse(value);
                if (Temporal.PlainDate.compare(value, bound) >= 0) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDate>();
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
                        Temporal.PlainDate.from('2020-01-01'),
                        Temporal.PlainDate.from('2020-01-01').withCalendar('japanese'),
                    ],
                    ...ladderExamples,
                ],
            },
        );
    });

    it('is immutable', () => {
        const original = p.plainDate();
        const modified = original.min(Temporal.PlainDate.from('2020-01-01'));
        expect(modified).not.toEqual(original);
        const branched = modified.max(Temporal.PlainDate.from('2025-01-01'));
        expect(branched).not.toEqual(modified);
    });
});

describe('max', () => {
    it('accepts at-or-before the bound, rejects after it as too_recent', () => {
        fc.assert(
            fc.property(plainDateArb, plainDateArb, (bound, value) => {
                const result = p.plainDate().max(bound).safeParse(value);
                if (Temporal.PlainDate.compare(value, bound) <= 0) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDate>();
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
                        Temporal.PlainDate.from('2020-01-01'),
                        Temporal.PlainDate.from('2020-01-01').withCalendar('japanese'),
                    ],
                    ...ladderExamples,
                ],
            },
        );
    });

    it('is immutable', () => {
        const original = p.plainDate();
        const modified = original.max(Temporal.PlainDate.from('2025-01-01'));
        expect(modified).not.toEqual(original);
        const branched = modified.min(Temporal.PlainDate.from('2020-01-01'));
        expect(branched).not.toEqual(modified);
    });
});

describe('contradictory bounds', () => {
    const lower = Temporal.PlainDate.from('2020-01-01');
    const upper = Temporal.PlainDate.from('2019-01-01');

    it('throws when the minimum exceeds the maximum', () => {
        expect(() => p.plainDate().min(lower).max(upper)).toThrow('Minimum must not exceed maximum.');
        expect(() => p.plainDate().max(upper).min(lower)).toThrow('Minimum must not exceed maximum.');
    });

    it('allows equal minimum and maximum', () => {
        expect(() => p.plainDate().min(lower).max(lower)).not.toThrow();
    });
});

it('accepts optional values', () => {
    const schema = p.plainDate().optional();

    fc.assert(
        fc.property(fc.option(plainDateArb, { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDate | undefined>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.plainDate().nullable();

    fc.assert(
        fc.property(fc.option(plainDateArb, { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDate | null>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
