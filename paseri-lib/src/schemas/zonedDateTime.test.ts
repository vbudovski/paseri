import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const zonedDateTimeArb = fc
    .date({ min: new Date('1970-01-01T00:00:00Z'), max: new Date('2100-12-31T00:00:00Z'), noInvalidDate: true })
    .map((d) => Temporal.Instant.fromEpochMilliseconds(d.getTime()).toZonedDateTimeISO('UTC'));

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

    it('accepts valid values', () => {
        const schema = p.zonedDateTime().min(boundary);

        fc.assert(
            fc.property(
                zonedDateTimeArb.filter((d) => Temporal.ZonedDateTime.compare(d, boundary) >= 0),
                (data) => {
                    const result = schema.safeParse(data);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.ZonedDateTime>;
                        expect(result.value).toBe(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.zonedDateTime().min(boundary);

        fc.assert(
            fc.property(
                zonedDateTimeArb.filter((d) => Temporal.ZonedDateTime.compare(d, boundary) < 0),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'too_dated' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
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

    it('accepts valid values', () => {
        const schema = p.zonedDateTime().max(boundary);

        fc.assert(
            fc.property(
                zonedDateTimeArb.filter((d) => Temporal.ZonedDateTime.compare(d, boundary) <= 0),
                (data) => {
                    const result = schema.safeParse(data);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.ZonedDateTime>;
                        expect(result.value).toBe(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.zonedDateTime().max(boundary);

        fc.assert(
            fc.property(
                zonedDateTimeArb.filter((d) => Temporal.ZonedDateTime.compare(d, boundary) > 0),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'too_recent' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
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
