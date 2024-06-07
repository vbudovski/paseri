import { describe, expect, test } from 'vitest';
import { ObjectSchema } from './object';
import type { ParseErrorResult, ParseSuccessResult } from './schema';
import { StringSchema } from './string';

describe('Type', () => {
    const schema = new ObjectSchema({
        string1: new StringSchema(),
        object1: new ObjectSchema({ string2: new StringSchema() }),
        object2: new ObjectSchema({ object3: new ObjectSchema({ string3: new StringSchema() }) }),
    });

    test('Valid', async () => {
        const result = schema.safeParse({
            string1: 'hello',
            object1: { string2: 'world' },
            object2: { object3: { string3: 'abc' } },
        });
        expect(result.status).toBe('success');
        const success = result as ParseSuccessResult<{ string1: string }>;
        expect(success.value).toEqual({
            string1: 'hello',
            object1: { string2: 'world' },
            object2: { object3: { string3: 'abc' } },
        });
    });

    test('Invalid child value', async () => {
        const result = schema.safeParse({
            string1: 123,
            object1: { string2: 'world' },
            object2: { object3: { string3: 'abc' } },
        });
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: ['string1'], message: 'Not a string.' }]);
    });

    test('Invalid deep child value', async () => {
        const result = schema.safeParse({
            string1: 'hello',
            object1: { string2: 456 },
            object2: { object3: { string3: null } },
        });
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([
            { path: ['object1', 'string2'], message: 'Not a string.' },
            { path: ['object2', 'object3', 'string3'], message: 'Not a string.' },
        ]);
    });

    test('Not an object', async () => {
        const result = schema.safeParse(null);
        expect(result.status).toBe('error');
        const error = result as ParseErrorResult;
        expect(error.errors).toEqual([{ path: [], message: 'Not an object.' }]);
    });
});
