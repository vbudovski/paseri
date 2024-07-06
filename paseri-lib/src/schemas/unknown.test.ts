import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import * as p from '../index.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = p.unknown();

    await t.step('String', () => {
        const result = schema.safeParse('Hello, world!');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<unknown>;
            expect(result.value).toBe('Hello, world!');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Number', () => {
        const result = schema.safeParse(123);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<unknown>;
            expect(result.value).toBe(123);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Object', () => {
        const result = schema.safeParse({});
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<unknown>;
            expect(result.value).toEqual({});
        } else {
            expect(result.ok).toBeTruthy();
        }
    });
});
