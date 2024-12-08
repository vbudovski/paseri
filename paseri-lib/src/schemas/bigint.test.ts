import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.bigint();

    fc.assert(
        fc.property(fc.bigInt(), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<bigint>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid type', () => {
    const schema = p.bigint();

    fc.assert(
        fc.property(
            fc.anything().filter((value) => typeof value !== 'bigint'),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected bigint.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Valid gte', () => {
    const schema = p.bigint().gte(10n);

    fc.assert(
        fc.property(fc.bigInt({ min: 10n }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<bigint>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid gte', () => {
    const schema = p.bigint().gte(10n);

    fc.assert(
        fc.property(fc.bigInt({ max: 9n }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'Too small.' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid gt', () => {
    const schema = p.bigint().gt(10n);

    fc.assert(
        fc.property(fc.bigInt({ min: 11n }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<bigint>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid gt', () => {
    const schema = p.bigint().gt(10n);

    fc.assert(
        fc.property(fc.bigInt({ max: 10n }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'Too small.' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid lte', () => {
    const schema = p.bigint().lte(10n);

    fc.assert(
        fc.property(fc.bigInt({ max: 10n }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<bigint>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid lte', () => {
    const schema = p.bigint().lte(10n);

    fc.assert(
        fc.property(fc.bigInt({ min: 11n }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'Too large.' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid lt', () => {
    const schema = p.bigint().lt(10n);

    fc.assert(
        fc.property(fc.bigInt({ max: 9n }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<bigint>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid lt', () => {
    const schema = p.bigint().lt(10n);

    fc.assert(
        fc.property(fc.bigInt({ min: 10n }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'Too large.' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Optional', () => {
    const schema = p.bigint().optional();

    fc.assert(
        fc.property(fc.option(fc.bigInt(), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<bigint | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Nullable', () => {
    const schema = p.bigint().nullable();

    fc.assert(
        fc.property(fc.option(fc.bigInt(), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<bigint | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Optional', () => {
    const schema = p.bigint().optional();
    const result = schema.safeParse(undefined);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<bigint | undefined>;
        expect(result.value).toBe(undefined);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Nullable', () => {
    const schema = p.bigint().nullable();
    const result = schema.safeParse(null);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<bigint | null>;
        expect(result.value).toBe(null);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Immutable', async (t) => {
    await t.step('gte', () => {
        const original = p.bigint();
        const modified = original.gte(3n);
        expect(modified).not.toEqual(original);
    });

    await t.step('gt', () => {
        const original = p.bigint();
        const modified = original.gt(3n);
        expect(modified).not.toEqual(original);
    });

    await t.step('lte', () => {
        const original = p.bigint();
        const modified = original.lte(3n);
        expect(modified).not.toEqual(original);
    });

    await t.step('lt', () => {
        const original = p.bigint();
        const modified = original.lt(3n);
        expect(modified).not.toEqual(original);
    });
});
