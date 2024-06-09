import { expect } from '@std/expect';
import * as s from '../src/index.ts';
import type { ParseErrorResult, ParseSuccessResult } from './schema.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = s.number();

    await t.step('Valid', () => {
        const result = schema.safeParse(123);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(123);
    });

    await t.step('Not a number', () => {
        const result = schema.safeParse(null);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not a number.' }]);
    });
});

test('Greater than or equal', async (t) => {
    const schema = s.number().gte(10);

    await t.step('Valid', () => {
        const result = schema.safeParse(10);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(10);
    });

    await t.step('Too small', () => {
        const result = schema.safeParse(9);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Too small.' }]);
    });
});

test('Greater than', async (t) => {
    const schema = s.number().gt(10);

    await t.step('Valid', () => {
        const result = schema.safeParse(11);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(11);
    });

    await t.step('Too small', () => {
        const result = schema.safeParse(10);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Too small.' }]);
    });
});

test('Less than or equal', async (t) => {
    const schema = s.number().lte(10);

    await t.step('Valid', () => {
        const result = schema.safeParse(10);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(10);
    });

    await t.step('Too large', () => {
        const result = schema.safeParse(11);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Too large.' }]);
    });
});

test('Less than', async (t) => {
    const schema = s.number().lt(10);

    await t.step('Valid', () => {
        const result = schema.safeParse(9);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(9);
    });

    await t.step('Too large', () => {
        const result = schema.safeParse(10);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Too large.' }]);
    });
});

test('Integer', async (t) => {
    const schema = s.number().int();

    await t.step('Valid', () => {
        const result = schema.safeParse(123);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(123);
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(123.4);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not an integer.' }]);
    });
});

test('Finite', async (t) => {
    const schema = s.number().finite();

    await t.step('Valid', () => {
        const result = schema.safeParse(123);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(123);
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(Number.NEGATIVE_INFINITY);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not finite.' }]);
    });
});

test('Safe integer', async (t) => {
    const schema = s.number().safe();

    await t.step('Valid', () => {
        const result = schema.safeParse(123);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(123);
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(Number.MAX_SAFE_INTEGER + 1);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not safe integer.' }]);
    });
});
