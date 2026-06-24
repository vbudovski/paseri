import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts valid types', () => {
    const schema = p.date();

    fc.assert(
        fc.property(fc.date({ noInvalidDate: true }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Date>();
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.date();

    fc.assert(
        fc.property(fc.anything({ withDate: false }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'invalid_type' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

it('rejects invalid dates', () => {
    const schema = p.date();

    const result = schema.safeParse(new Date(Number.NaN));
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'invalid_date' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('short-circuits the bound check on an invalid date inside a container', () => {
    // An invalid date fails before the min/max bounds run, so it reports only `invalid_date` — never a bound leaf
    // stacked on top. Nesting in an object exercises the accumulating error path (distinct from the bare-date case
    // above, which short-circuits trivially by returning).
    const schema = p.object({ d: p.date().min(new Date(2020, 0, 1)) });

    const result = schema.safeParse({ d: new Date(Number.NaN) });
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: ['d'], message: 'invalid_date' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

describe('min', () => {
    it('accepts at-or-after the bound, rejects before it as too_dated', () => {
        fc.assert(
            fc.property(fc.date({ noInvalidDate: true }), fc.date({ noInvalidDate: true }), (bound, value) => {
                const result = p.date().min(bound).safeParse(value);
                if (value.getTime() >= bound.getTime()) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Date>();
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
            // Seed the exact-boundary case (two distinct Dates at the same time): it alone distinguishes an inclusive
            // bound from an exclusive one, and random dates never coincide to the millisecond.
            { examples: [[new Date(2020, 0, 1), new Date(2020, 0, 1)]] },
        );
    });

    it('throws on invalid Date boundary', () => {
        expect(() => p.date().min(new Date(Number.NaN))).toThrow();
    });

    it('is immutable', () => {
        const original = p.date();
        const modified = original.min(new Date(2020, 0, 1));
        expect(modified).not.toEqual(original);
        const branched = modified.max(new Date(2025, 0, 1));
        expect(branched).not.toEqual(modified);
    });

    it('clones the bound value', () => {
        const bound = new Date(2020, 0, 1);
        const schema = p.date().min(bound);
        bound.setFullYear(2030);

        const input = new Date(2025, 0, 1);
        const result = schema.safeParse(input);
        if (result.ok) {
            expect(result.value).toBe(input);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });
});

describe('max', () => {
    it('accepts at-or-before the bound, rejects after it as too_recent', () => {
        fc.assert(
            fc.property(fc.date({ noInvalidDate: true }), fc.date({ noInvalidDate: true }), (bound, value) => {
                const result = p.date().max(bound).safeParse(value);
                if (value.getTime() <= bound.getTime()) {
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<Date>();
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
            { examples: [[new Date(2020, 0, 1), new Date(2020, 0, 1)]] },
        );
    });

    it('throws on invalid Date boundary', () => {
        expect(() => p.date().max(new Date(Number.NaN))).toThrow();
    });

    it('is immutable', () => {
        const original = p.date();
        const modified = original.max(new Date(2025, 0, 1));
        expect(modified).not.toEqual(original);
        const branched = modified.min(new Date(2020, 0, 1));
        expect(branched).not.toEqual(modified);
    });

    it('clones the bound value', () => {
        const bound = new Date(2020, 0, 1);
        const schema = p.date().max(bound);
        bound.setFullYear(2010);

        const input = new Date(2015, 0, 1);
        const result = schema.safeParse(input);
        if (result.ok) {
            expect(result.value).toBe(input);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });
});

describe('contradictory bounds', () => {
    const lower = new Date(2020, 0, 1);
    const upper = new Date(2019, 0, 1);

    it('throws when the minimum exceeds the maximum', () => {
        expect(() => p.date().min(lower).max(upper)).toThrow('Minimum must not exceed maximum.');
        expect(() => p.date().max(upper).min(lower)).toThrow('Minimum must not exceed maximum.');
    });

    it('allows equal minimum and maximum', () => {
        expect(() => p.date().min(lower).max(lower)).not.toThrow();
    });
});

it('accepts optional values', () => {
    const schema = p.date().optional();

    fc.assert(
        fc.property(fc.option(fc.date({ noInvalidDate: true }), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Date | undefined>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.date().nullable();

    fc.assert(
        fc.property(fc.option(fc.date({ noInvalidDate: true }), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Date | null>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
