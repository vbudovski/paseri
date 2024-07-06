import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import * as p from '../index.ts';
import type { TreeNode } from '../issue.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n));

    await t.step('Valid', () => {
        const result = schema.safeParse([1, 'foo', 123n]);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<[number, string, 123n]>;
            expect(result.value).toEqual([1, 'foo', 123n]);
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

test('Too long', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n));
    const data = [1, 'foo', 123n, 'bad'];

    const result = schema.safeParse(data);
    if (!result.ok) {
        const expectedResult: TreeNode = {
            type: 'leaf',
            code: 'too_long',
        };
        expect(result.issue).toEqual(expectedResult);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Too short', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n));
    const data = [1, 'foo'];

    const result = schema.safeParse(data);
    if (!result.ok) {
        const expectedResult: TreeNode = {
            type: 'leaf',
            code: 'too_short',
        };
        expect(result.issue).toEqual(expectedResult);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Invalid elements', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n), p.number());
    const data = [123, 666, 123n, 'foo'];

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
    const schema = p.tuple(p.number(), p.string(), p.literal(123n)).optional();
    const result = schema.safeParse(undefined);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<[number, string, 123n] | undefined>;
        expect(result.value).toBe(undefined);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Nullable', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n)).nullable();
    const result = schema.safeParse(null);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<[number, string, 123n] | null>;
        expect(result.value).toBe(null);
    } else {
        expect(result.ok).toBeTruthy();
    }
});
