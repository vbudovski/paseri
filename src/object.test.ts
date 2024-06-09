import { expect } from '@std/expect';
import { ObjectSchema } from './object.ts';
import { StringSchema } from './string.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = new ObjectSchema({
        string1: new StringSchema(),
        object1: new ObjectSchema({ string2: new StringSchema() }),
        object2: new ObjectSchema({ object3: new ObjectSchema({ string3: new StringSchema() }) }),
    });

    await t.step('Valid', () => {
        const result = schema.safeParse({
            string1: 'hello',
            object1: { string2: 'world' },
            object2: { object3: { string3: 'abc' } },
        });
        if (result.status === 'success') {
            expect(result.value).toEqual({
                string1: 'hello',
                object1: { string2: 'world' },
                object2: { object3: { string3: 'abc' } },
            });
        } else {
            expect(result.status).toBe('success');
        }
    });

    await t.step('Invalid child value', () => {
        const result = schema.safeParse({
            string1: 123,
            object1: { string2: 'world' },
            object2: { object3: { string3: 'abc' } },
        });
        if (result.status === 'error') {
            expect(result.errors).toEqual([{ path: ['string1'], message: 'Not a string.' }]);
        } else {
            expect(result.status).toBe('error');
        }
    });

    await t.step('Invalid deep child value', () => {
        const result = schema.safeParse({
            string1: 'hello',
            object1: { string2: 456 },
            object2: { object3: { string3: null } },
        });
        if (result.status === 'error') {
            expect(result.errors).toEqual([
                { path: ['object1', 'string2'], message: 'Not a string.' },
                { path: ['object2', 'object3', 'string3'], message: 'Not a string.' },
            ]);
        } else {
            expect(result.status).toBe('error');
        }
    });

    await t.step('Not an object', () => {
        const result = schema.safeParse(null);
        if (result.status === 'error') {
            expect(result.errors).toEqual([{ path: [], message: 'Not an object.' }]);
        } else {
            expect(result.status).toBe('error');
        }
    });
});
