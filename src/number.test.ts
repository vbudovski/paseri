import { describe, expect, test } from 'vitest';
import { NumberSchema } from './number';
import type { ParseErrorResult, ParseSuccessResult } from './schema';

describe('Type', () => {
    const schema = new NumberSchema();

    test('Valid', async () => {
        const result = schema.safeParse(123);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(123);
    });

    test('Not a number', async () => {
        const result = schema.safeParse(null);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not a number.' }]);
    });
});

describe('Greater than or equal', () => {
    const schema = new NumberSchema().gte(10);

    test('Valid', async () => {
        const result = schema.safeParse(10);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(10);
    });

    test('Too small', async () => {
        const result = schema.safeParse(9);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Too small.' }]);
    });
});

describe('Greater than', () => {
    const schema = new NumberSchema().gt(10);

    test('Valid', async () => {
        const result = schema.safeParse(11);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(11);
    });

    test('Too small', async () => {
        const result = schema.safeParse(10);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Too small.' }]);
    });
});

describe('Less than or equal', () => {
    const schema = new NumberSchema().lte(10);

    test('Valid', async () => {
        const result = schema.safeParse(10);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(10);
    });

    test('Too large', async () => {
        const result = schema.safeParse(11);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Too large.' }]);
    });
});

describe('Less than', () => {
    const schema = new NumberSchema().lt(10);

    test('Valid', async () => {
        const result = schema.safeParse(9);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(9);
    });

    test('Too large', async () => {
        const result = schema.safeParse(10);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Too large.' }]);
    });
});

describe('Integer', () => {
    const schema = new NumberSchema().int();

    test('Valid', async () => {
        const result = schema.safeParse(123);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(123);
    });

    test('Invalid', async () => {
        const result = schema.safeParse(123.4);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not an integer.' }]);
    });
});

describe('Finite', () => {
    const schema = new NumberSchema().finite();

    test('Valid', async () => {
        const result = schema.safeParse(123);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(123);
    });

    test('Invalid', async () => {
        const result = schema.safeParse(Number.NEGATIVE_INFINITY);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not finite.' }]);
    });
});

describe('Safe integer', () => {
    const schema = new NumberSchema().safe();

    test('Valid', async () => {
        const result = schema.safeParse(123);
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<number>;
        expect(success.value).toBe(123);
    });

    test('Invalid', async () => {
        const result = schema.safeParse(Number.MAX_SAFE_INTEGER + 1);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not safe integer.' }]);
    });
});
