import { expect } from '@std/expect';
import * as s from '../src/index.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = s.boolean();

    await t.step('Valid', () => {
        const result = schema.safeParse(true);
        if (result.ok) {
            expect(result.value).toBe(true);
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
