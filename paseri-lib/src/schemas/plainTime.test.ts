import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const plainTimeArb = fc
    .record({
        hour: fc.integer({ min: 0, max: 23 }),
        minute: fc.integer({ min: 0, max: 59 }),
        second: fc.integer({ min: 0, max: 59 }),
    })
    .map((t) => Temporal.PlainTime.from(t));

it('accepts valid types', () => {
    const schema = p.plainTime();

    fc.assert(
        fc.property(plainTimeArb, (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainTime>;
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

    it('accepts valid values', () => {
        const schema = p.plainTime().min(boundary);

        fc.assert(
            fc.property(
                plainTimeArb.filter((t) => Temporal.PlainTime.compare(t, boundary) >= 0),
                (data) => {
                    const result = schema.safeParse(data);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainTime>;
                        expect(result.value).toBe(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.plainTime().min(boundary);

        fc.assert(
            fc.property(
                plainTimeArb.filter((t) => Temporal.PlainTime.compare(t, boundary) < 0),
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
        const original = p.plainTime();
        const modified = original.min(boundary);
        expect(modified).not.toEqual(original);
        const branched = modified.max(Temporal.PlainTime.from('18:00:00'));
        expect(branched).not.toEqual(modified);
    });
});

describe('max', () => {
    const boundary = Temporal.PlainTime.from('12:00:00');

    it('accepts valid values', () => {
        const schema = p.plainTime().max(boundary);

        fc.assert(
            fc.property(
                plainTimeArb.filter((t) => Temporal.PlainTime.compare(t, boundary) <= 0),
                (data) => {
                    const result = schema.safeParse(data);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainTime>;
                        expect(result.value).toBe(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.plainTime().max(boundary);

        fc.assert(
            fc.property(
                plainTimeArb.filter((t) => Temporal.PlainTime.compare(t, boundary) > 0),
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
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainTime | undefined>;
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
                expectTypeOf(result.value).toEqualTypeOf<Temporal.PlainTime | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
