import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('substitutes default for undefined input', () => {
    const schema = p.number().optional().default(123);
    const result = schema.safeParse(undefined);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<number>;
        expect(result.value).toBe(123);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('passes non-undefined input through to the base schema', () => {
    const schema = p.number().optional().default(123);

    fc.assert(
        fc.property(fc.integer(), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid (non-undefined) input', () => {
    const schema = p.number().optional().default(123);

    fc.assert(
        fc.property(
            fc.anything().filter((v) => typeof v !== 'number' && v !== undefined),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_type' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

it('restricts `.default` to OptionalSchema', () => {
    expectTypeOf(p.string()).not.toHaveProperty('default');
    expectTypeOf(p.string().optional()).toHaveProperty('default');
});

describe('inside object schemas', () => {
    it('substitutes for missing required fields', () => {
        const schema = p.object({
            host: p.string(),
            port: p.number().optional().default(123),
        });
        const result = schema.safeParse({ host: 'localhost' });
        if (result.ok) {
            expect(result.value).toEqual({ host: 'localhost', port: 123 });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('still errors on missing fields without a default', () => {
        const schema = p.object({
            host: p.string(),
            port: p.number().optional().default(123),
        });
        const result = schema.safeParse({ port: 9090 });
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: ['host'], message: 'missing_value' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('validates defaulted fields against the base schema', () => {
        const schema = p.object({
            port: p.number().optional().default(123),
        });
        const result = schema.safeParse({ port: 'not a number' });
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: ['port'], message: 'invalid_type' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

describe('mutation safety', () => {
    it('decouples from the caller reference', () => {
        const original = { debug: false };
        const schema = p.object({
            options: p.object({ debug: p.boolean() }).optional().default(original),
        });

        original.debug = true;

        const result = schema.safeParse({});
        if (result.ok) {
            expect(result.value).toEqual({ options: { debug: false } });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('returns the same frozen reference across parses', () => {
        const schema = p.object({
            tags: p.array(p.string()).optional().default([]),
        });

        const a = schema.safeParse({});
        const b = schema.safeParse({});
        if (a.ok && b.ok) {
            expect(a.value.tags).toBe(b.value.tags);
            expect(Object.isFrozen(a.value.tags)).toBe(true);
        } else {
            expect(a.ok).toBeTruthy();
            expect(b.ok).toBeTruthy();
        }
    });
});
