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
                expectTypeOf(result.value).toEqualTypeOf<Date>;
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
                expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected Date.' }]);
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
        expect(result.messages()).toEqual([{ path: [], message: 'Invalid date.' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

describe('min', () => {
    it('accepts valid values', () => {
        const schema = p.date().min(new Date(2020, 0, 1));

        fc.assert(
            fc.property(fc.date({ min: new Date(2020, 0, 1), noInvalidDate: true }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Date>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.date().min(new Date(2020, 0, 1));

        fc.assert(
            fc.property(fc.date({ max: new Date(2019, 11, 31), noInvalidDate: true }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Too dated.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
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
});

describe('max', () => {
    it('accepts valid values', () => {
        const schema = p.date().max(new Date(2020, 0, 1));

        fc.assert(
            fc.property(fc.date({ max: new Date(2020, 0, 1), noInvalidDate: true }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Date>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.date().max(new Date(2020, 0, 1));

        fc.assert(
            fc.property(fc.date({ min: new Date(2020, 0, 2), noInvalidDate: true }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Too recent.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
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
});

it('accepts optional values', () => {
    const schema = p.date().optional();

    fc.assert(
        fc.property(fc.option(fc.date({ noInvalidDate: true }), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Date | undefined>;
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
                expectTypeOf(result.value).toEqualTypeOf<Date | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
