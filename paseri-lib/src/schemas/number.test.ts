import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.number();

    fc.assert(
        fc.property(fc.float(), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid type', () => {
    const schema = p.number();

    fc.assert(
        fc.property(
            fc.anything().filter((value) => typeof value !== 'number'),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_type' });
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Valid gte', () => {
    const schema = p.number().gte(10);

    fc.assert(
        fc.property(fc.float({ noNaN: true, min: 10 }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid gte', () => {
    const schema = p.number().gte(10);

    fc.assert(
        fc.property(fc.float({ noNaN: true, max: 10, maxExcluded: true }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'too_small' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid gt', () => {
    const schema = p.number().gt(10);

    fc.assert(
        fc.property(fc.float({ noNaN: true, min: 10, minExcluded: true }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid gt', () => {
    const schema = p.number().gt(10);

    fc.assert(
        fc.property(fc.float({ noNaN: true, max: 10 }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'too_small' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid lte', () => {
    const schema = p.number().lte(10);

    fc.assert(
        fc.property(fc.float({ noNaN: true, max: 10 }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid lte', () => {
    const schema = p.number().lte(10);

    fc.assert(
        fc.property(fc.float({ noNaN: true, min: 10, minExcluded: true }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'too_large' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid lt', () => {
    const schema = p.number().lt(10);

    fc.assert(
        fc.property(fc.float({ noNaN: true, max: 10, maxExcluded: true }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid lt', () => {
    const schema = p.number().lt(10);

    fc.assert(
        fc.property(fc.float({ noNaN: true, min: 10 }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'too_large' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid int', () => {
    const schema = p.number().int();

    fc.assert(
        fc.property(fc.integer(), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid int', () => {
    const schema = p.number().int();

    fc.assert(
        fc.property(fc.float({ noInteger: true }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_integer' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid finite', () => {
    const schema = p.number().finite();

    fc.assert(
        fc.property(fc.float({ noNaN: true, noDefaultInfinity: true }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid finite', () => {
    const schema = p.number().finite();

    fc.assert(
        fc.property(
            fc.oneof(
                fc.constant(Number.POSITIVE_INFINITY),
                fc.constant(Number.NEGATIVE_INFINITY),
                fc.constant(Number.NaN),
            ),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_finite' });
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Valid safe', () => {
    const schema = p.number().safe();

    fc.assert(
        fc.property(fc.maxSafeInteger(), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid safe', () => {
    const schema = p.number().safe();

    fc.assert(
        fc.property(
            fc.oneof(fc.constant(Number.MAX_SAFE_INTEGER + 1), fc.constant(Number.MIN_SAFE_INTEGER - 1)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_safe_integer' });
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Optional', () => {
    const schema = p.number().optional();

    fc.assert(
        fc.property(fc.option(fc.float(), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Nullable', () => {
    const schema = p.number().nullable();

    fc.assert(
        fc.property(fc.option(fc.float(), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Immutable', async (t) => {
    await t.step('gte', () => {
        const original = p.number();
        const modified = original.gte(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('gt', () => {
        const original = p.number();
        const modified = original.gt(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('lte', () => {
        const original = p.number();
        const modified = original.lte(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('lt', () => {
        const original = p.number();
        const modified = original.lt(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('int', () => {
        const original = p.number();
        const modified = original.int();
        expect(modified).not.toEqual(original);
    });

    await t.step('finite', () => {
        const original = p.number();
        const modified = original.finite();
        expect(modified).not.toEqual(original);
    });

    await t.step('safe', () => {
        const original = p.number();
        const modified = original.safe();
        expect(modified).not.toEqual(original);
    });
});
