import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import * as p from '../index.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = p.symbol();

    await t.step('Valid', () => {
        const data = Symbol.for('foo');

        const result = schema.safeParse(data);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<symbol>;
            expect(result.value).toBe(Symbol.for('foo'));
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Not a symbol', () => {
        const data = null;

        const result = schema.safeParse(data);
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected Symbol.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Optional', () => {
    const schema = p.symbol().optional();
    const data = undefined;

    const result = schema.safeParse(data);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<symbol | undefined>;
        expect(result.value).toBe(undefined);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Nullable', () => {
    const schema = p.symbol().nullable();
    const data = null;

    const result = schema.safeParse(data);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<symbol | null>;
        expect(result.value).toBe(null);
    } else {
        expect(result.ok).toBeTruthy();
    }
});
