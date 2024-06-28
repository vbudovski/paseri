import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import * as p from '../src/index.ts';
import type { TreeNode } from './issue.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = p.union(p.string(), p.number(), p.literal(123n));

    await t.step('Valid string', () => {
        const result = schema.safeParse('Hello, world!');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<string | number | 123n>;
            expect(result.value).toBe('Hello, world!');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Valid number', () => {
        const result = schema.safeParse(1);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<string | number | 123n>;
            expect(result.value).toBe(1);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Valid literal', () => {
        const result = schema.safeParse(123n);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<string | number | 123n>;
            expect(result.value).toBe(123n);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(null);
        if (!result.ok) {
            const expectedResult: TreeNode = { type: 'leaf', code: 'invalid_value' };
            expect(result.issue).toEqual(expectedResult);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});
