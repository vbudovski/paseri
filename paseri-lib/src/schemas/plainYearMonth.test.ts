import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const plainYearMonthArb = fc
    .record({
        year: fc.integer({ min: 1900, max: 2100 }),
        month: fc.integer({ min: 1, max: 12 }),
    })
    .map((y) => Temporal.PlainYearMonth.from(y));

it('accepts valid types', () => {
    const schema = p.plainYearMonth();

    fc.assert(
        fc.property(plainYearMonthArb, (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainYearMonth>;
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

    it('accepts valid values', () => {
        const schema = p.plainYearMonth().min(boundary);

        fc.assert(
            fc.property(
                plainYearMonthArb.filter((y) => Temporal.PlainYearMonth.compare(y, boundary) >= 0),
                (data) => {
                    const result = schema.safeParse(data);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainYearMonth>;
                        expect(result.value).toBe(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.plainYearMonth().min(boundary);

        fc.assert(
            fc.property(
                plainYearMonthArb.filter((y) => Temporal.PlainYearMonth.compare(y, boundary) < 0),
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
        const original = p.plainYearMonth();
        const modified = original.min(boundary);
        expect(modified).not.toEqual(original);
        const branched = modified.max(Temporal.PlainYearMonth.from('2025-12'));
        expect(branched).not.toEqual(modified);
    });
});

describe('max', () => {
    const boundary = Temporal.PlainYearMonth.from('2020-01');

    it('accepts valid values', () => {
        const schema = p.plainYearMonth().max(boundary);

        fc.assert(
            fc.property(
                plainYearMonthArb.filter((y) => Temporal.PlainYearMonth.compare(y, boundary) <= 0),
                (data) => {
                    const result = schema.safeParse(data);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainYearMonth>;
                        expect(result.value).toBe(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.plainYearMonth().max(boundary);

        fc.assert(
            fc.property(
                plainYearMonthArb.filter((y) => Temporal.PlainYearMonth.compare(y, boundary) > 0),
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
        const original = p.plainYearMonth();
        const modified = original.max(boundary);
        expect(modified).not.toEqual(original);
        const branched = modified.min(Temporal.PlainYearMonth.from('2010-01'));
        expect(branched).not.toEqual(modified);
    });
});

it('accepts optional values', () => {
    const schema = p.plainYearMonth().optional();

    fc.assert(
        fc.property(fc.option(plainYearMonthArb, { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainYearMonth | undefined>;
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
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainYearMonth | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
