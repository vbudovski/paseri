import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import * as p from '../index.ts';

const { test } = Deno;

test('Success', () => {
    const schema = p.string();
    const result = schema.safeParse('foo');
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<string>;
        expect(result.value).toBe('foo');
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Failure', () => {
    const schema = p.string();
    const result = schema.safeParse(123);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected string.' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});
