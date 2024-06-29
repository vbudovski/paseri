import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import * as p from '../src/index.ts';
import type { TreeNode } from './issue.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = p.never();

    await t.step('String', () => {
        const data = 'Hello, world!';

        const result = schema.safeParse(data);
        if (!result.ok) {
            const expectedResult: TreeNode = { type: 'leaf', code: 'invalid_type' };
            expect(result.issue).toEqual(expectedResult);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Undefined', () => {
        const data = undefined;

        const result = schema.safeParse(data);
        if (!result.ok) {
            const expectedResult: TreeNode = { type: 'leaf', code: 'invalid_type' };
            expect(result.issue).toEqual(expectedResult);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Null', () => {
        const data = null;

        const result = schema.safeParse(data);
        if (!result.ok) {
            const expectedResult: TreeNode = { type: 'leaf', code: 'invalid_type' };
            expect(result.issue).toEqual(expectedResult);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});
