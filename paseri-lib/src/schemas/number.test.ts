import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import * as p from '../index.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = p.number();

    await t.step('Valid', () => {
        const result = schema.safeParse(123);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<number>;
            expect(result.value).toBe(123);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Not a number', () => {
        const result = schema.safeParse(null);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_type' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Greater than or equal', async (t) => {
    const schema = p.number().gte(10);

    await t.step('Valid', () => {
        const result = schema.safeParse(10);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<number>;
            expect(result.value).toBe(10);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too small', () => {
        const result = schema.safeParse(9);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_small' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Greater than', async (t) => {
    const schema = p.number().gt(10);

    await t.step('Valid', () => {
        const result = schema.safeParse(11);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<number>;
            expect(result.value).toBe(11);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too small', () => {
        const result = schema.safeParse(10);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_small' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Less than or equal', async (t) => {
    const schema = p.number().lte(10);

    await t.step('Valid', () => {
        const result = schema.safeParse(10);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<number>;
            expect(result.value).toBe(10);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too large', () => {
        const result = schema.safeParse(11);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_large' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Less than', async (t) => {
    const schema = p.number().lt(10);

    await t.step('Valid', () => {
        const result = schema.safeParse(9);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<number>;
            expect(result.value).toBe(9);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too large', () => {
        const result = schema.safeParse(10);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_large' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Integer', async (t) => {
    const schema = p.number().int();

    await t.step('Valid', () => {
        const result = schema.safeParse(123);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<number>;
            expect(result.value).toBe(123);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(123.4);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_integer' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Finite', async (t) => {
    const schema = p.number().finite();

    await t.step('Valid', () => {
        const result = schema.safeParse(123);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<number>;
            expect(result.value).toBe(123);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(Number.NEGATIVE_INFINITY);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_finite' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Safe integer', async (t) => {
    const schema = p.number().safe();

    await t.step('Valid', () => {
        const result = schema.safeParse(123);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<number>;
            expect(result.value).toBe(123);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(Number.MAX_SAFE_INTEGER + 1);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_safe_integer' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Optional', () => {
    const schema = p.number().optional();
    const result = schema.safeParse(undefined);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<number | undefined>;
        expect(result.value).toBe(undefined);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Nullable', () => {
    const schema = p.number().nullable();
    const result = schema.safeParse(null);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<number | null>;
        expect(result.value).toBe(null);
    } else {
        expect(result.ok).toBeTruthy();
    }
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
