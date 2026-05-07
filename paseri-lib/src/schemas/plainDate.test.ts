import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const plainDateArb = fc
    .date({
        min: new Date('1970-01-01T00:00:00Z'),
        max: new Date('2100-12-31T00:00:00Z'),
        noInvalidDate: true,
    })
    .map((d) =>
        Temporal.PlainDate.from({
            year: d.getUTCFullYear(),
            month: d.getUTCMonth() + 1,
            day: d.getUTCDate(),
        }),
    );

it('accepts valid types', () => {
    const schema = p.plainDate();

    fc.assert(
        fc.property(plainDateArb, (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDate>;
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
    it('accepts valid values', () => {
        const boundary = Temporal.PlainDate.from('2020-01-01');
        const schema = p.plainDate().min(boundary);

        fc.assert(
            fc.property(
                plainDateArb.filter((d) => Temporal.PlainDate.compare(d, boundary) >= 0),
                (data) => {
                    const result = schema.safeParse(data);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDate>;
                        expect(result.value).toBe(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const boundary = Temporal.PlainDate.from('2020-01-01');
        const schema = p.plainDate().min(boundary);

        fc.assert(
            fc.property(
                plainDateArb.filter((d) => Temporal.PlainDate.compare(d, boundary) < 0),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([
                            {
                                path: [],
                                message: 'too_dated',
                            },
                        ]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
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
    it('accepts valid values', () => {
        const boundary = Temporal.PlainDate.from('2020-01-01');
        const schema = p.plainDate().max(boundary);

        fc.assert(
            fc.property(
                plainDateArb.filter((d) => Temporal.PlainDate.compare(d, boundary) <= 0),
                (data) => {
                    const result = schema.safeParse(data);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDate>;
                        expect(result.value).toBe(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const boundary = Temporal.PlainDate.from('2020-01-01');
        const schema = p.plainDate().max(boundary);

        fc.assert(
            fc.property(
                plainDateArb.filter((d) => Temporal.PlainDate.compare(d, boundary) > 0),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([
                            {
                                path: [],
                                message: 'too_recent',
                            },
                        ]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
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

it('accepts optional values', () => {
    const schema = p.plainDate().optional();

    fc.assert(
        fc.property(fc.option(plainDateArb, { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDate | undefined>;
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
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainDate | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
