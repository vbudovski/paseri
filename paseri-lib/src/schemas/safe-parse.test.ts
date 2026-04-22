import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import * as p from '../index.ts';

it('returns ok result on success', () => {
    const schema = p.string();
    const result = schema.safeParse('foo');
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<string>;
        expect(result.value).toBe('foo');
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('returns error result on failure', () => {
    const schema = p.string();
    const result = schema.safeParse(123);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected string.' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});
