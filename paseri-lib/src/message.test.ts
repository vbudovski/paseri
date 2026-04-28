import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import * as p from './index.ts';
import { en } from './locales/en.ts';

it('throws when locale is missing a message for a custom code', () => {
    const schema = p.string().chain(p.string(), () => p.err('custom_code'));
    const result = schema.safeParse('hello');
    if (!result.ok) {
        expect(() => result.messages(en)).toThrow('No message for code custom_code.');
    }
});

it('substitutes a single-string placeholder', () => {
    const schema = p.string();
    const result = schema.safeParse(123);
    if (!result.ok) {
        expect(result.messages(en)).toEqual([{ path: [], message: 'Invalid type. Expected string.' }]);
    }
});

it('substitutes an array placeholder joined with " | "', () => {
    const schema = p.union(
        p.object({ shape: p.literal('circle'), radius: p.number() }),
        p.object({ shape: p.literal('rectangle'), width: p.number(), height: p.number() }),
    );
    const result = schema.safeParse({});
    if (!result.ok) {
        expect(result.messages(en)).toEqual([
            { path: [], message: "Invalid discriminator value. Expected 'circle' | 'rectangle'." },
        ]);
    }
});
