import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.date();

    fc.assert(
        fc.property(
            fc.integer().filter((value) => !Number.isNaN(new Date(value).getTime())),
            (data) => {
                const result = schema.safeParse(new Date(data));
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Date>;
                    expect(result.value.getTime()).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Invalid type', () => {
    const schema = p.date();

    fc.assert(
        // fast-check does not support `Date`s yet, so no need to filter.
        fc.property(fc.anything(), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected Date.' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Invalid date', () => {
    const schema = p.date();

    const result = schema.safeParse(new Date(Number.NaN));
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'Invalid date.' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Valid min', () => {
    const schema = p.date().min(new Date(2020, 0, 1));

    fc.assert(
        fc.property(
            fc
                .integer({ min: new Date(2020, 0, 1).getTime(), max: Number.MAX_SAFE_INTEGER })
                .filter((value) => !Number.isNaN(new Date(value).getTime())),
            (data) => {
                const result = schema.safeParse(new Date(data));
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Date>;
                    expect(result.value.getTime()).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Invalid min', () => {
    const schema = p.date().min(new Date(2020, 0, 1));

    fc.assert(
        fc.property(
            fc
                .integer({ min: -Number.MAX_SAFE_INTEGER, max: new Date(2020, 0, 1).getTime() - 1 })
                .filter((value) => !Number.isNaN(new Date(value).getTime())),
            (data) => {
                const result = schema.safeParse(new Date(data));
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Too dated.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Valid max', () => {
    const schema = p.date().max(new Date(2020, 0, 1));

    fc.assert(
        fc.property(
            fc
                .integer({ min: -Number.MAX_SAFE_INTEGER, max: new Date(2020, 0, 1).getTime() })
                .filter((value) => !Number.isNaN(new Date(value).getTime())),
            (data) => {
                const result = schema.safeParse(new Date(data));
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Date>;
                    expect(result.value.getTime()).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Invalid max', () => {
    const schema = p.date().max(new Date(2020, 0, 1));

    fc.assert(
        fc.property(
            fc
                .integer({ min: new Date(2020, 0, 1).getTime() + 1, max: Number.MAX_SAFE_INTEGER })
                .filter((value) => !Number.isNaN(new Date(value).getTime())),
            (data) => {
                const result = schema.safeParse(new Date(data));
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Too recent.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Optional', () => {
    const schema = p.date().optional();

    fc.assert(
        fc.property(
            fc.option(
                fc.integer().filter((value) => !Number.isNaN(new Date(value).getTime())),
                { nil: undefined },
            ),
            (data) => {
                const result = schema.safeParse(data === undefined ? data : new Date(data));
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Date | undefined>;
                    expect(result.value === undefined ? result.value : result.value.getTime()).toEqual(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Nullable', () => {
    const schema = p.date().nullable();

    fc.assert(
        fc.property(
            fc.option(
                fc.integer().filter((value) => !Number.isNaN(new Date(value).getTime())),
                { nil: null },
            ),
            (data) => {
                const result = schema.safeParse(data === null ? data : new Date(data));
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Date | null>;
                    expect(result.value === null ? result.value : result.value.getTime()).toEqual(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Immutable', async (t) => {
    await t.step('min', () => {
        const original = p.date();
        const modified = original.min(new Date(2020, 0, 1));
        expect(modified).not.toEqual(original);
    });

    await t.step('max', () => {
        const original = p.date();
        const modified = original.max(new Date(2020, 0, 1));
        expect(modified).not.toEqual(original);
    });
});
