import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import * as p from '../index.ts';

const { test } = Deno;

test('String', async (t) => {
    const schema = p.literal('apple');

    await t.step('Valid', () => {
        const result = schema.safeParse('apple');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<'apple'>;
            expect(result.value).toBe('apple');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse('banana');
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_value' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Number', async (t) => {
    const schema = p.literal(123);

    await t.step('Valid', () => {
        const result = schema.safeParse(123);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<123>;
            expect(result.value).toBe(123);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(456);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_value' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('BigInt', async (t) => {
    const schema = p.literal(123n);

    await t.step('Valid', () => {
        const result = schema.safeParse(123n);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<123n>;
            expect(result.value).toBe(123n);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(456n);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_value' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Boolean', async (t) => {
    const schema = p.literal(true);

    await t.step('Valid', () => {
        const result = schema.safeParse(true);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<true>;
            expect(result.value).toBe(true);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(false);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_value' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Symbol', async (t) => {
    const symbolLiteral = Symbol.for('test');
    const schema = p.literal(symbolLiteral);

    await t.step('Valid', () => {
        const data = Symbol.for('test');

        const result = schema.safeParse(data);

        if (result.ok) {
            expect(result.value).toBe(symbolLiteral);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const data = Symbol.for('other');

        const result = schema.safeParse(data);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_value' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Optional', () => {
    const schema = p.literal('apple').optional();
    const result = schema.safeParse(undefined);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<'apple' | undefined>;
        expect(result.value).toBe(undefined);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Nullable', () => {
    const schema = p.literal('apple').nullable();
    const result = schema.safeParse(null);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<'apple' | null>;
        expect(result.value).toBe(null);
    } else {
        expect(result.ok).toBeTruthy();
    }
});
