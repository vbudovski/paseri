import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import * as p from '../src/index.ts';
import type { TreeNode } from './issue.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = p.null();

    await t.step('Valid', () => {
        const result = schema.safeParse(null);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<null>;
            expect(result.value).toBe(null);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Not null', () => {
        const result = schema.safeParse(undefined);
        if (!result.ok) {
            const expectedResult: TreeNode = { type: 'leaf', code: 'invalid_value' };
            expect(result.issue).toEqual(expectedResult);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});
