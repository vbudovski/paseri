import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import * as p from '../index.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = p.bigint();

    await t.step('Valid', () => {
        const result = schema.safeParse(123n);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<bigint>;
            expect(result.value).toBe(123n);
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
    const schema = p.bigint().gte(10n);

    await t.step('Valid', () => {
        const result = schema.safeParse(10n);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<bigint>;
            expect(result.value).toBe(10n);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too small', () => {
        const result = schema.safeParse(9n);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_small' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Greater than', async (t) => {
    const schema = p.bigint().gt(10n);

    await t.step('Valid', () => {
        const result = schema.safeParse(11n);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<bigint>;
            expect(result.value).toBe(11n);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too small', () => {
        const result = schema.safeParse(10n);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_small' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Less than or equal', async (t) => {
    const schema = p.bigint().lte(10n);

    await t.step('Valid', () => {
        const result = schema.safeParse(10n);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<bigint>;
            expect(result.value).toBe(10n);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too large', () => {
        const result = schema.safeParse(11n);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_large' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Less than', async (t) => {
    const schema = p.bigint().lt(10n);

    await t.step('Valid', () => {
        const result = schema.safeParse(9n);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<bigint>;
            expect(result.value).toBe(9n);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too large', () => {
        const result = schema.safeParse(10n);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_large' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
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
