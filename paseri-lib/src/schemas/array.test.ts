import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import * as p from '../index.ts';
import type { TreeNode } from '../issue.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = p.array(p.number());

    await t.step('Valid', () => {
        const result = schema.safeParse([1, 2, 3]);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<number[]>;
            expect(result.value).toEqual([1, 2, 3]);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(null);
        if (!result.ok) {
            const expectedResult: TreeNode = { type: 'leaf', code: 'invalid_type' };
            expect(result.issue).toEqual(expectedResult);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Min', async (t) => {
    const schema = p.array(p.number()).min(3);

    await t.step('Valid', () => {
        const result = schema.safeParse([1, 2, 3]);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<number[]>;
            expect(result.value).toEqual([1, 2, 3]);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too short', () => {
        const result = schema.safeParse([1, 2]);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_short' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Max', async (t) => {
    const schema = p.array(p.number()).max(3);

    await t.step('Valid', () => {
        const result = schema.safeParse([1, 2, 3]);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<number[]>;
            expect(result.value).toEqual([1, 2, 3]);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too long', () => {
        const result = schema.safeParse([1, 2, 3, 4]);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_long' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Length', async (t) => {
    const schema = p.array(p.number()).length(3);

    await t.step('Valid', () => {
        const result = schema.safeParse([1, 2, 3]);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<number[]>;
            expect(result.value).toEqual([1, 2, 3]);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too long', () => {
        const result = schema.safeParse([1, 2, 3, 4]);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_long' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Too short', () => {
        const result = schema.safeParse([1, 2]);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_short' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Invalid elements', () => {
    const schema = p.array(p.number());
    const data = [1, 'foo', 2, 'bar'];

    const result = schema.safeParse(data);
    if (!result.ok) {
        const expectedResult: TreeNode = {
            type: 'join',
            left: { type: 'nest', key: 1, child: { type: 'leaf', code: 'invalid_type' } },
            right: { type: 'nest', key: 3, child: { type: 'leaf', code: 'invalid_type' } },
        };
        expect(result.issue).toEqual(expectedResult);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Optional', () => {
    const schema = p.array(p.number()).optional();
    const result = schema.safeParse(undefined);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<number[] | undefined>;
        expect(result.value).toBe(undefined);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Nullable', () => {
    const schema = p.array(p.number()).nullable();
    const result = schema.safeParse(null);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<number[] | null>;
        expect(result.value).toBe(null);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Immutable', async (t) => {
    await t.step('min', () => {
        const original = p.array(p.string());
        const modified = original.min(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('max', () => {
        const original = p.array(p.string());
        const modified = original.max(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('length', () => {
        const original = p.array(p.string());
        const modified = original.length(3);
        expect(modified).not.toEqual(original);
    });
});
