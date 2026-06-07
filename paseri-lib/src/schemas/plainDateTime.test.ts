import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

// Spans the full ISO year range, every sub-second field, and every built-in calendar: iso8601 values exercise the
// lexicographic field-compare fast path, while other calendars report divergent calendar fields and defer to
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
const plainDateTimeArb = fc
    .record({
        year: fc.integer({ min: -5000, max: 9999 }),
        month: fc.integer({ min: 1, max: 12 }),
        day: fc.integer({ min: 1, max: 28 }),
        hour: fc.integer({ min: 0, max: 23 }),
        minute: fc.integer({ min: 0, max: 59 }),
        second: fc.integer({ min: 0, max: 59 }),
        millisecond: fc.integer({ min: 0, max: 999 }),
        microsecond: fc.integer({ min: 0, max: 999 }),
        nanosecond: fc.integer({ min: 0, max: 999 }),
        calendar: fc.constantFrom(...calendars),
    })
    .map(({ calendar, ...parts }) => Temporal.PlainDateTime.from(parts).withCalendar(calendar));

it('accepts valid types', () => {
    const schema = p.plainDateTime();

    fc.assert(
        fc.property(plainDateTimeArb, (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDateTime>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.plainDateTime();

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
    const boundary = Temporal.PlainDateTime.from('2020-01-01T00:00:00');

    it('accepts at-or-after the bound, rejects before it as too_dated', () => {
        fc.assert(
            fc.property(plainDateTimeArb, plainDateTimeArb, (bound, value) => {
                const result = p.plainDateTime().min(bound).safeParse(value);
                if (Temporal.PlainDateTime.compare(value, bound) >= 0) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDateTime>;
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
                        Temporal.PlainDateTime.from('2020-01-01T00:00:00'),
                        Temporal.PlainDateTime.from('2020-01-01T00:00:00').withCalendar('japanese'),
                    ],
                ],
            },
        );
    });

    it('is immutable', () => {
        const original = p.plainDateTime();
        const modified = original.min(boundary);
        expect(modified).not.toEqual(original);
        const branched = modified.max(Temporal.PlainDateTime.from('2025-01-01T00:00:00'));
        expect(branched).not.toEqual(modified);
    });
});

describe('max', () => {
    const boundary = Temporal.PlainDateTime.from('2020-01-01T00:00:00');

    it('accepts at-or-before the bound, rejects after it as too_recent', () => {
        fc.assert(
            fc.property(plainDateTimeArb, plainDateTimeArb, (bound, value) => {
                const result = p.plainDateTime().max(bound).safeParse(value);
                if (Temporal.PlainDateTime.compare(value, bound) <= 0) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDateTime>;
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
                        Temporal.PlainDateTime.from('2020-01-01T00:00:00'),
                        Temporal.PlainDateTime.from('2020-01-01T00:00:00').withCalendar('japanese'),
                    ],
                ],
            },
        );
    });

    it('is immutable', () => {
        const original = p.plainDateTime();
        const modified = original.max(boundary);
        expect(modified).not.toEqual(original);
        const branched = modified.min(Temporal.PlainDateTime.from('2010-01-01T00:00:00'));
        expect(branched).not.toEqual(modified);
    });
});

it('accepts optional values', () => {
    const schema = p.plainDateTime().optional();

    fc.assert(
        fc.property(fc.option(plainDateTimeArb, { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDateTime | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.plainDateTime().nullable();

    fc.assert(
        fc.property(fc.option(plainDateTimeArb, { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDateTime | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
