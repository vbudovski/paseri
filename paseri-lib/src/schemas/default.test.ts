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

it('preserves a negative-zero default', () => {
    const schema = p.number().optional().default(-0);
    const result = schema.safeParse(undefined);
    if (result.ok) {
        expect(Object.is(result.value, -0)).toBe(true);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('preserves a default whose string contains module syntax', () => {
    const schema = p.string().optional().default('export function evil() {}');
    const result = schema.safeParse(undefined);
    if (result.ok) {
        expect(result.value).toBe('export function evil() {}');
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

describe('collection defaults', () => {
    it('substitutes a Set default for undefined input', () => {
        const schema = p
            .set(p.string())
            .optional()
            .default(new Set(['a', 'b']));
        const result = schema.safeParse(undefined);
        if (result.ok) {
            expect(result.value).toBeInstanceOf(Set);
            expect([...result.value]).toEqual(['a', 'b']);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('substitutes a Map default for undefined input', () => {
        const schema = p
            .map(p.string(), p.number())
            .optional()
            .default(new Map([['a', 1]]));
        const result = schema.safeParse(undefined);
        if (result.ok) {
            expect(result.value).toBeInstanceOf(Map);
            expect([...result.value]).toEqual([['a', 1]]);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });
});

describe('object key defaults', () => {
    it('substitutes a default object whose keys need quoting', () => {
        const schema = p.record(p.number()).optional().default({ 'a-b': 1, '1x': 2, 'has space': 3 });
        const result = schema.safeParse(undefined);
        if (result.ok) {
            expect(result.value).toEqual({ 'a-b': 1, '1x': 2, 'has space': 3 });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('preserves an own __proto__ key in a default object', () => {
        const schema = p
            .record(p.number())
            .optional()
            .default(JSON.parse('{"__proto__": 5}') as Record<string, number>);
        const result = schema.safeParse(undefined);
        if (result.ok) {
            expect(Object.hasOwn(result.value, '__proto__')).toBe(true);
            expect(Object.getOwnPropertyDescriptor(result.value, '__proto__')?.value).toBe(5);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });
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

    it('substitutes for missing required fields in strip mode when an unrecognised key is present', () => {
        const schema = p
            .object({
                host: p.string(),
                port: p.number().optional().default(123),
            })
            .strip();
        const result = schema.safeParse({ host: 'localhost', extra: 'remove me' });
        if (result.ok) {
            expect(result.value).toEqual({ host: 'localhost', port: 123 });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('substitutes for a missing field whose base schema accepts undefined', () => {
        const schema = p.object({ nested: p.object({ value: p.unknown().optional().default('x') }) });
        const result = schema.safeParse({ nested: {} });
        if (result.ok) {
            expect(result.value).toEqual({ nested: { value: 'x' } });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('substitutes for a missing field whose default is wrapped in nullable', () => {
        const schema = p.object({ value: p.string().optional().default('x').nullable(), other: p.number() });
        const result = schema.safeParse({ other: 1 });
        if (result.ok) {
            expect(result.value).toEqual({ value: 'x', other: 1 });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('treats a missing wrapped-default field exactly like explicit undefined', () => {
        const schema = p.object({ value: p.string().optional().default('x').nullable() });
        const missing = schema.safeParse({});
        const explicit = schema.safeParse({ value: undefined });
        if (missing.ok && explicit.ok) {
            expect(missing.value).toEqual(explicit.value);
        } else {
            expect(missing.ok && explicit.ok).toBeTruthy();
        }
    });

    it('still accepts null for a nullable-wrapped default field', () => {
        const schema = p.object({ value: p.string().optional().default('x').nullable() });
        const result = schema.safeParse({ value: null });
        if (result.ok) {
            expect(result.value).toEqual({ value: null });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('runs a refinement on the substituted default for a missing field', () => {
        const schema = p.object({
            value: p
                .string()
                .optional()
                .default('x')
                .refine((current) => current !== 'x', { code: 'rejects_default' }),
        });
        const missing = schema.safeParse({});
        const explicit = schema.safeParse({ value: undefined });
        if (!missing.ok && !explicit.ok) {
            expect(missing.messages()).toEqual(explicit.messages());
        } else {
            expect(!missing.ok && !explicit.ok).toBeTruthy();
        }
    });

    it('substitutes for a missing __proto__ field', () => {
        // Regression: the default fill went through the inherited __proto__ setter on the internal
        // accumulator in Annex B environments (Node/browsers, Deno with --unstable-unsafe-proto) and
        // silently vanished from the output.
        const schema = p.object({ ['__proto__']: p.number().optional().default(5), other: p.string() });
        const result = schema.safeParse({ other: 'x' });
        if (result.ok) {
            expect(Object.hasOwn(result.value, '__proto__')).toBe(true);
            expect(Object.getOwnPropertyDescriptor(result.value, '__proto__')?.value).toBe(5);
            expect(Object.getPrototypeOf(result.value)).toBe(Object.prototype);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('does not substitute for a non-enumerable own field', () => {
        const schema = p.object({ port: p.number().optional().default(123) });
        const data: Record<string, unknown> = {};
        Object.defineProperty(data, 'port', { value: 8080, enumerable: false });

        const result = schema.safeParse(data);
        if (result.ok) {
            expect(result.value.port).toBe(8080);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('validates a non-enumerable own field against the defaulted base schema', () => {
        const schema = p.object({ port: p.number().optional().default(123) });
        const data: Record<string, unknown> = {};
        Object.defineProperty(data, 'port', { value: 'not a number', enumerable: false });

        const result = schema.safeParse(data);
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: ['port'], message: 'invalid_type' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('still errors on a missing sibling field whose schema accepts undefined', () => {
        const schema = p.object({ value: p.unknown(), port: p.number().optional().default(123) });
        const result = schema.safeParse({});
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: ['value'], message: 'missing_value' }]);
        } else {
            expect(result.ok).toBeFalsy();
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
