import { expect } from '@std/expect';
import type { ParseErrorResult, ParseSuccessResult } from './schema.ts';
import { StringSchema } from './string.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = new StringSchema();

    await t.step('Valid', () => {
        const result = schema.safeParse('Hello, world!');
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<string>;
        expect(success.value).toBe('Hello, world!');
    });

    await t.step('Not a string', () => {
        const result = schema.safeParse(null);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not a string.' }]);
    });
});

test('Min', async (t) => {
    const schema = new StringSchema().min(3);

    await t.step('Valid', () => {
        const result = schema.safeParse('aaa');
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<string>;
        expect(success.value).toBe('aaa');
    });

    await t.step('Too short', () => {
        const result = schema.safeParse('aa');
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Too short.' }]);
    });
});

test('Max', async (t) => {
    const schema = new StringSchema().max(3);

    await t.step('Valid', () => {
        const result = schema.safeParse('aaa');
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<string>;
        expect(success.value).toBe('aaa');
    });

    await t.step('Too long', () => {
        const result = schema.safeParse('aaaa');
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Too long.' }]);
    });
});

test('Length', async (t) => {
    const schema = new StringSchema().length(3);

    await t.step('Valid', () => {
        const result = schema.safeParse('aaa');
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<string>;
        expect(success.value).toBe('aaa');
    });

    await t.step('Too long', () => {
        const result = schema.safeParse('aaaa');
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Too long.' }]);
    });

    await t.step('Too short', () => {
        const result = schema.safeParse('aa');
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Too short.' }]);
    });
});

test('Email', async (t) => {
    const schema = new StringSchema().email();

    await t.step('Valid', () => {
        const result = schema.safeParse('hello@example.com');
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<string>;
        expect(success.value).toBe('hello@example.com');
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse('not_an_email');
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not an email.' }]);
    });
});

test('Emoji', async (t) => {
    const schema = new StringSchema().emoji();

    await t.step('Valid', () => {
        const result = schema.safeParse('🥳');
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<string>;
        expect(success.value).toBe('🥳');
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse('a');
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not an emoji.' }]);
    });
});

test('UUID', async (t) => {
    const schema = new StringSchema().uuid();

    await t.step('Valid', () => {
        const result = schema.safeParse('d98d4b7e-58a5-4e21-839b-2699b94c115b');
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<string>;
        expect(success.value).toBe('d98d4b7e-58a5-4e21-839b-2699b94c115b');
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse('not_a_uuid');
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not a UUID.' }]);
    });
});

test('Nano ID', async (t) => {
    const schema = new StringSchema().nanoid();

    await t.step('Valid', () => {
        const result = schema.safeParse('V1StGXR8_Z5jdHi6B-myT');
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<string>;
        expect(success.value).toBe('V1StGXR8_Z5jdHi6B-myT');
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse('not_a_nano_id');
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not a Nano ID.' }]);
    });
});
