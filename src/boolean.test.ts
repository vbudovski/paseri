import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import * as p from '../src/index.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = p.boolean();

    await t.step('Valid', () => {
        const result = schema.safeParse(true);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<boolean>;
            expect(result.value).toBe(true);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Not a boolean', () => {
        const result = schema.safeParse(null);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_type' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Optional', () => {
    const schema = p.boolean().optional();
    const result = schema.safeParse(undefined);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<boolean | undefined>;
        expect(result.value).toBe(undefined);
    } else {
        expect(result.ok).toBeTruthy();
    }
});
