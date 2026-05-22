import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import * as p from './index.ts';
import { en } from './locales/en.ts';

describe('missing-code aggregation', () => {
    it('throws with the missing code listed', () => {
        const schema = p.string().chain(p.string(), () => p.err('custom_code'));
        const result = schema.safeParse('hello');
        if (!result.ok) {
            expect(() => result.messages(en)).toThrow('No messages for codes: custom_code.');
        }
    });

    it('aggregates multiple missing codes, sorted alphabetically', () => {
        const schema = p.object({
            a: p.string().chain(p.string(), () => p.err('zeta_code')),
            b: p.string().chain(p.string(), () => p.err('alpha_code')),
            c: p.string().chain(p.string(), () => p.err('mu_code')),
        });
        const result = schema.safeParse({ a: 'x', b: 'y', c: 'z' });
        if (!result.ok) {
            expect(() => result.messages(en)).toThrow('No messages for codes: alpha_code, mu_code, zeta_code.');
        }
    });

    it('deduplicates repeated missing codes', () => {
        const schema = p.array(p.string().chain(p.string(), () => p.err('repeated_code')));
        const result = schema.safeParse(['x', 'y', 'z']);
        if (!result.ok) {
            expect(() => result.messages(en)).toThrow('No messages for codes: repeated_code.');
        }
    });
});

it('returns raw codes when no locale is provided', () => {
    const schema = p.string().chain(p.string(), () => p.err('custom_code'));
    const result = schema.safeParse('hello');
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'custom_code' }]);
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
