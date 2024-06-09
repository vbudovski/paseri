import { expect } from '@std/expect';
import * as s from '../src/index.ts';
import type { ParseErrorResult, ParseSuccessResult } from './schema.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = s.boolean();

    await t.step('Valid', () => {
        const result = schema.safeParse(true);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<boolean>;
        expect(success.value).toBe(true);
    });

    await t.step('Not a number', () => {
        const result = schema.safeParse(null);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not a boolean.' }]);
    });
});
