import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import * as p from '../index.ts';

it('accepts valid symbols', () => {
    const schema = p.symbol();
    const data = Symbol.for('foo');

    const result = schema.safeParse(data);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<symbol>;
        expect(result.value).toBe(Symbol.for('foo'));
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('rejects non-symbols', () => {
    const schema = p.symbol();
    const data = null;

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'invalid_type' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('accepts optional values', () => {
    const schema = p.optional(p.symbol());
    const data = undefined;

    const result = schema.safeParse(data);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<symbol | undefined>;
        expect(result.value).toBe(undefined);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('accepts nullable values', () => {
    const schema = p.nullable(p.symbol());
    const data = null;

    const result = schema.safeParse(data);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<symbol | null>;
        expect(result.value).toBe(null);
    } else {
        expect(result.ok).toBeTruthy();
    }
});
