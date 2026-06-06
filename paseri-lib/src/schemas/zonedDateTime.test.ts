import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const zonedDateTimeArb = fc
    .tuple(
        fc.date({ min: new Date('1970-01-01T00:00:00Z'), max: new Date('2100-12-31T00:00:00Z'), noInvalidDate: true }),
        fc.constantFrom('UTC', 'America/New_York', 'Asia/Kolkata', 'Australia/Eucla', 'Pacific/Kiritimati'),
        fc.constantFrom('iso8601', 'hebrew', 'japanese', 'islamic-umalqura'),
    )
    .map(([d, timeZone, calendar]) =>
        Temporal.Instant.fromEpochMilliseconds(d.getTime()).toZonedDateTimeISO(timeZone).withCalendar(calendar),
    );

it('accepts valid types', () => {
    const schema = p.zonedDateTime();

    fc.assert(
        fc.property(zonedDateTimeArb, (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.ZonedDateTime>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.zonedDateTime();

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
    const boundary = Temporal.ZonedDateTime.from('2020-01-01T00:00:00Z[UTC]');

    it('accepts at-or-after the bound, rejects before it as too_dated', () => {
        fc.assert(
            fc.property(zonedDateTimeArb, zonedDateTimeArb, (bound, value) => {
                const result = p.zonedDateTime().min(bound).safeParse(value);
                if (Temporal.ZonedDateTime.compare(value, bound) >= 0) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.ZonedDateTime>;
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
            // Seed the exact boundary instant — the single input that distinguishes an inclusive bound (`>= 0`) from an
            // exclusive one. Every strictly-greater/lesser value passes under either, so fast-check, sampling
            // millisecond instants across a ~130-year span, never lands on it. Reaching it from a different time zone
            // and calendar than the bound's also pins that ordering is epoch-ns-only — compare ties at 0 regardless.
            {
                examples: [
                    [boundary, boundary.toInstant().toZonedDateTimeISO('Asia/Kolkata').withCalendar('japanese')],
                ],
            },
        );
    });

    it('is immutable', () => {
        const original = p.zonedDateTime();
        const modified = original.min(boundary);
        expect(modified).not.toEqual(original);
        const branched = modified.max(Temporal.ZonedDateTime.from('2025-01-01T00:00:00Z[UTC]'));
        expect(branched).not.toEqual(modified);
    });
});

describe('max', () => {
    const boundary = Temporal.ZonedDateTime.from('2020-01-01T00:00:00Z[UTC]');

    it('accepts at-or-before the bound, rejects after it as too_recent', () => {
        fc.assert(
            fc.property(zonedDateTimeArb, zonedDateTimeArb, (bound, value) => {
                const result = p.zonedDateTime().max(bound).safeParse(value);
                if (Temporal.ZonedDateTime.compare(value, bound) <= 0) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.ZonedDateTime>;
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
                    [boundary, boundary.toInstant().toZonedDateTimeISO('Asia/Kolkata').withCalendar('japanese')],
                ],
            },
        );
    });

    it('is immutable', () => {
        const original = p.zonedDateTime();
        const modified = original.max(boundary);
        expect(modified).not.toEqual(original);
        const branched = modified.min(Temporal.ZonedDateTime.from('2010-01-01T00:00:00Z[UTC]'));
        expect(branched).not.toEqual(modified);
    });
});

it('accepts optional values', () => {
    const schema = p.zonedDateTime().optional();

    fc.assert(
        fc.property(fc.option(zonedDateTimeArb, { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.ZonedDateTime | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.zonedDateTime().nullable();

    fc.assert(
        fc.property(fc.option(zonedDateTimeArb, { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.ZonedDateTime | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
