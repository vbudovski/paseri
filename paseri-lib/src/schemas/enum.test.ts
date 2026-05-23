import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import * as p from '../index.ts';
import { en } from '../locales/index.ts';

it('accepts a string value in the set', () => {
    const schema = p.enum('red', 'green', 'blue');
    const result = schema.safeParse('red');
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<'red' | 'green' | 'blue'>;
        expect(result.value).toBe('red');
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('accepts a number value in the set', () => {
    const schema = p.enum(1, 2, 3);
    const result = schema.safeParse(2);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<1 | 2 | 3>;
        expect(result.value).toBe(2);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('accepts a bigint value in the set', () => {
    const schema = p.enum(1n, 2n, 3n);
    const result = schema.safeParse(2n);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<1n | 2n | 3n>;
        expect(result.value).toBe(2n);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('accepts a boolean value in the set', () => {
    const schema = p.enum(true, false);
    const result = schema.safeParse(true);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<true | false>;
        expect(result.value).toBe(true);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('rejects a value not in the set', () => {
    const schema = p.enum('red', 'green', 'blue');
    const result = schema.safeParse('purple');
    if (!result.ok) {
        expect(result.messages(en)).toEqual([
            { path: [], message: "Invalid enum value. Expected 'red' | 'green' | 'blue'." },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('distinguishes a number from its string equivalent', () => {
    const schema = p.enum(1);
    expect(schema.safeParse('1').ok).toBe(false);
});

it('is unaffected by mutating the source array after construction', () => {
    const values = ['red', 'green', 'blue'] as const;
    const schema = p.enum(...values);
    (values as unknown as string[]).push('purple');
    const result = schema.safeParse('purple');
    expect(result.ok).toBe(false);
});

describe('extract', () => {
    it('accepts a value in the extracted set', () => {
        const schema = p.enum('red', 'green', 'blue').extract('red', 'green');
        const result = schema.safeParse('red');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<'red' | 'green'>;
            expect(result.value).toBe('red');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('rejects a value not in the extracted set', () => {
        const schema = p.enum('red', 'green', 'blue').extract('red', 'green');
        const result = schema.safeParse('blue');
        expect(result.ok).toBe(false);
    });

    it('is immutable', () => {
        const original = p.enum('red', 'green', 'blue');
        const extracted = original.extract('red');
        expect(extracted).not.toBe(original);
    });
});

describe('exclude', () => {
    it('rejects an excluded value', () => {
        const schema = p.enum('red', 'green', 'blue').exclude('red');
        const result = schema.safeParse('red');
        expect(result.ok).toBe(false);
    });

    it('accepts a non-excluded value', () => {
        const schema = p.enum('red', 'green', 'blue').exclude('red');
        const result = schema.safeParse('green');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<'green' | 'blue'>;
            expect(result.value).toBe('green');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('is immutable', () => {
        const original = p.enum('red', 'green', 'blue');
        const excluded = original.exclude('red');
        expect(excluded).not.toBe(original);
    });
});
