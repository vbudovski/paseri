import { expect } from '@std/expect';
import * as s from '../src/index.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = s.object({
        string1: s.string(),
        object1: s.object({ string2: s.string(), number1: s.number() }),
        object2: s.object({
            object3: s.object({ string3: s.string(), number2: s.number() }),
        }),
    });
    const schemaStrict = s
        .object({
            string1: s.string(),
            object1: s.object({ string2: s.string(), number1: s.number() }).strict(),
            object2: s
                .object({
                    object3: s.object({ string3: s.string(), number2: s.number() }).strict(),
                })
                .strict(),
        })
        .strict();

    await t.step('Valid', () => {
        const result = schema.safeParse({
            string1: 'hello',
            object1: { string2: 'world', number1: 123 },
            object2: { object3: { string3: 'abc', number2: 456 } },
        });
        if (result.ok) {
            expect(result.value).toEqual({
                string1: 'hello',
                object1: { string2: 'world', number1: 123 },
                object2: { object3: { string3: 'abc', number2: 456 } },
            });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Missing keys', () => {
        const result = schema.safeParse({
            object1: { string2: 'world' },
            object2: { object3: { string3: 'abc' } },
        });
        if (!result.ok) {
            expect(result.errors).toEqual([
                { path: ['string1'], message: 'Missing key.' },
                { path: ['object1', 'number1'], message: 'Missing key.' },
                { path: ['object2', 'object3', 'number2'], message: 'Missing key.' },
            ]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Extra keys', () => {
        const result = schema.safeParse({
            string1: 'hello',
            bad1: 'BAD',
            object1: { string2: 'world', number1: 123, bad2: 'BAD' },
            object2: { object3: { string3: 'abc', number2: 456, bad3: 'BAD' } },
        });
        if (result.ok) {
            expect(result.value).toEqual({
                string1: 'hello',
                object1: { string2: 'world', number1: 123 },
                object2: { object3: { string3: 'abc', number2: 456 } },
            });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Extra keys strict', () => {
        const result = schemaStrict.safeParse({
            string1: 'hello',
            bad1: 'BAD',
            object1: { string2: 'world', number1: 123, bad2: 'BAD' },
            object2: { object3: { string3: 'abc', number2: 456, bad3: 'BAD' } },
        });
        if (!result.ok) {
            expect(result.errors).toEqual([
                { path: ['object1'], message: "Unrecognised key(s) in object: 'bad2'." },
                { path: ['object2', 'object3'], message: "Unrecognised key(s) in object: 'bad3'." },
                { path: [], message: "Unrecognised key(s) in object: 'bad1'." },
            ]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Invalid child value', () => {
        const result = schema.safeParse({
            string1: 123,
            object1: { string2: 'world', number1: 123 },
            object2: { object3: { string3: 'abc', number2: 456 } },
        });
        if (!result.ok) {
            expect(result.errors).toEqual([{ path: ['string1'], message: 'Not a string.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Invalid deep child value', () => {
        const result = schema.safeParse({
            string1: 'hello',
            object1: { string2: 456, number1: 123 },
            object2: { object3: { string3: null, number2: 456 } },
        });
        if (!result.ok) {
            expect(result.errors).toEqual([
                { path: ['object1', 'string2'], message: 'Not a string.' },
                { path: ['object2', 'object3', 'string3'], message: 'Not a string.' },
            ]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Not an object', () => {
        const result = schema.safeParse(null);
        if (!result.ok) {
            expect(result.errors).toEqual([{ path: [], message: 'Not an object.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Deep not an object', () => {
        const result = schema.safeParse({
            string1: 'hello',
            object1: null,
            object2: { object3: null },
        });
        if (!result.ok) {
            expect(result.errors).toEqual([
                { path: ['object1'], message: 'Not an object.' },
                { path: ['object2', 'object3'], message: 'Not an object.' },
            ]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});
