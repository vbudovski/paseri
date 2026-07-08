import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('substitutes default for undefined input', () => {
    const schema = p.number().optional().default(123);
    const result = schema.safeParse(undefined);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<number>();
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

it('keeps a -0 default distinct from a 0 default on the same object', () => {
    const schema = p.object({ a: p.number().optional().default(-0), b: p.number().optional().default(0) });
    const result = schema.safeParse({});
    if (result.ok) {
        expect(Object.is(result.value.a, -0)).toBe(true);
        expect(Object.is(result.value.b, 0)).toBe(true);
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
                expectTypeOf(result.value).toEqualTypeOf<number>();
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

    // A default is cloned and frozen at construction, then handed back for undefined input, so it must round-trip
    // for any value — exercise the range (negative/large bigints, boundary dates), not one hand-picked value.
    it('returns a bigint default verbatim for undefined input', () => {
        fc.assert(
            fc.property(fc.bigInt(), (value) => {
                const result = p.bigint().optional().default(value).safeParse(undefined);
                if (result.ok) {
                    expect(result.value).toBe(value);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('returns a Date default verbatim for undefined input', () => {
        fc.assert(
            fc.property(fc.date({ noInvalidDate: true }), (value) => {
                const result = p.date().optional().default(value).safeParse(undefined);
                if (result.ok) {
                    expect(result.value).toEqual(value);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('substitutes a sparse-array default, preserving holes', () => {
        // biome-ignore lint/suspicious/noSparseArray: the hole is the value under test — it must survive to output.
        const schema = p.array(p.number().optional()).optional().default([1, , 3]);
        const result = schema.safeParse(undefined);
        if (result.ok) {
            expect(result.value.length).toBe(3);
            expect(1 in result.value).toBe(false);
            expect(result.value[0]).toBe(1);
            expect(result.value[2]).toBe(3);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });
});

describe('Temporal defaults', () => {
    // Temporal instances can't be `structuredClone`d, so `DefaultSchema` uses them as-is (frozen, not cloned).
    // Each type must round-trip as the same reference for undefined input.
    const cases: ReadonlyArray<{ name: string; schema: p.Schema<unknown>; value: unknown }> = [
        { name: 'instant', schema: p.instant(), value: Temporal.Instant.from('2020-01-01T00:00:00Z') },
        { name: 'plainDate', schema: p.plainDate(), value: Temporal.PlainDate.from('2020-01-01') },
        { name: 'plainDateTime', schema: p.plainDateTime(), value: Temporal.PlainDateTime.from('2020-01-01T12:30:00') },
        { name: 'plainMonthDay', schema: p.plainMonthDay(), value: Temporal.PlainMonthDay.from('01-01') },
        { name: 'plainTime', schema: p.plainTime(), value: Temporal.PlainTime.from('12:30:00') },
        { name: 'plainYearMonth', schema: p.plainYearMonth(), value: Temporal.PlainYearMonth.from('2020-01') },
        {
            name: 'zonedDateTime',
            schema: p.zonedDateTime(),
            value: Temporal.ZonedDateTime.from('2020-01-01T00:00:00+00:00[UTC]'),
        },
        { name: 'duration', schema: p.duration(), value: Temporal.Duration.from('P1Y2M3DT4H5M6S') },
    ];

    for (const { name, schema, value } of cases) {
        it(`accepts and returns a ${name} default for undefined input`, () => {
            const result = schema.optional().default(value).safeParse(undefined);
            if (result.ok) {
                expect(result.value).toBe(value);
            } else {
                expect(result.ok).toBeTruthy();
            }
        });
    }

    it('freezes the returned Temporal default so a stray property cannot leak across parses', () => {
        const schema = p.plainDate().optional().default(Temporal.PlainDate.from('2020-01-01'));
        const result = schema.safeParse(undefined);
        if (result.ok) {
            expect(Object.isFrozen(result.value)).toBe(true);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('accepts a Temporal instance nested inside a mutable default', () => {
        // structuredClone throws on Temporal, so a nested Temporal default used to fail at construction.
        const schema = p
            .object({ when: p.plainDate() })
            .optional()
            .default({ when: Temporal.PlainDate.from('2020-01-01') });
        const result = schema.safeParse(undefined);
        if (result.ok) {
            expect(result.value.when.toString()).toBe('2020-01-01');
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

    it('substitutes for a missing __proto__ field with a wrapped default', () => {
        // As above, but the default is wrapped (nullable), so absence must be detected via an own-key check:
        // reading value["__proto__"] on an absent key yields Object.prototype under Annex B, not undefined.
        const schema = p.object({ ['__proto__']: p.number().optional().default(5).nullable(), other: p.string() });
        const result = schema.safeParse({ other: 'x' });
        if (result.ok) {
            expect(Object.getOwnPropertyDescriptor(result.value, '__proto__')?.value).toBe(5);
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

    it('makes a Map default immutable so mutation cannot leak across parses', () => {
        // Object.freeze alone leaves Map mutators (set/delete/clear) working, so the shared default would leak.
        const schema = p
            .map(p.string(), p.number())
            .optional()
            .default(new Map([['a', 1]]));

        const first = schema.safeParse(undefined);
        if (first.ok) {
            expect(Object.isFrozen(first.value)).toBe(true);
            expect(() => first.value.set('b', 2)).toThrow();
            const second = schema.safeParse(undefined);
            if (second.ok) {
                expect([...second.value]).toEqual([['a', 1]]);
            } else {
                expect(second.ok).toBeTruthy();
            }
        } else {
            expect(first.ok).toBeTruthy();
        }
    });

    it('makes a Set default immutable so mutation cannot leak across parses', () => {
        const schema = p
            .set(p.string())
            .optional()
            .default(new Set(['a']));

        const first = schema.safeParse(undefined);
        if (first.ok) {
            expect(Object.isFrozen(first.value)).toBe(true);
            expect(() => first.value.add('b')).toThrow();
            const second = schema.safeParse(undefined);
            if (second.ok) {
                expect([...second.value]).toEqual(['a']);
            } else {
                expect(second.ok).toBeTruthy();
            }
        } else {
            expect(first.ok).toBeTruthy();
        }
    });
});

describe('rejects non-serialisable defaults', () => {
    // A function or symbol is an opaque identity — structuredClone can't clone it and no literal can embed it —
    // so it can't be a stored default; construction rejects it.
    it('throws on a function default', () => {
        expect(() =>
            p
                .unknown()
                .optional()
                .default(() => 42),
        ).toThrow('cannot be a function');
    });

    it('throws on a symbol default', () => {
        expect(() => p.unknown().optional().default(Symbol('x'))).toThrow('cannot be a symbol');
    });

    it('throws on a RegExp default', () => {
        expect(() => p.unknown().optional().default(/foo/i)).toThrow('cannot be a RegExp');
    });

    it('throws on a typed-array default', () => {
        expect(() =>
            p
                .unknown()
                .optional()
                .default(new Uint8Array([1, 2, 3])),
        ).toThrow('cannot be a Uint8Array');
    });

    it('throws on a class-instance default', () => {
        class Point {
            x = 1;
        }
        expect(() => p.unknown().optional().default(new Point())).toThrow('cannot be a Point');
    });

    it('throws on a non-serialisable value nested in an object default', () => {
        expect(() => p.object({ re: p.unknown() }).optional().default({ re: /foo/i })).toThrow('cannot be a RegExp');
    });

    it('throws on a function nested in an object default', () => {
        expect(() =>
            p
                .object({ fn: p.unknown() })
                .optional()
                .default({ fn: () => 1 }),
        ).toThrow('cannot be a function');
    });
});
