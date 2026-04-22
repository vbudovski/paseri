import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';
import { isPlainObject } from '../utils.ts';

it('accepts valid types', () => {
    const bar = Symbol.for('bar');
    const schema = p.object({ foo: p.string(), 1: p.number(), [bar]: p.number() });

    fc.assert(
        fc.property(fc.record({ foo: fc.string(), 1: fc.float({ noNaN: true }), [bar]: fc.integer() }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<{ foo: string; 1: number; [bar]: number }>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.object({ foo: p.string() });

    fc.assert(
        fc.property(
            fc.anything({ withDate: true, withSet: true, withMap: true }).filter((value) => !isPlainObject(value)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected object.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

it('exposes the shape', () => {
    const shape = { foo: p.string(), bar: p.number(), baz: p.literal(123n) };
    const schema = p.object(shape);
    expectTypeOf(schema.shape).toEqualTypeOf<typeof shape>;
});

describe('strip', () => {
    it('strips unrecognised keys', () => {
        const schema = p
            .object({
                foo: p.string(),
                bar: p
                    .object({
                        baz: p.number(),
                    })
                    .strip(),
            })
            .strip();

        fc.assert(
            fc.property(
                fc.record({
                    foo: fc.string(),
                    bar: fc.record({ baz: fc.float({ noNaN: true }), extra2: fc.anything() }),
                    extra1: fc.anything(),
                }),
                (data) => {
                    const result = schema.safeParse(data);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<{ foo: string; bar: { baz: number } }>;
                        const expectedResult = { foo: data.foo, bar: { baz: data.bar.baz } };
                        expect(result.value).toEqual(expectedResult);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('is immutable', () => {
        const original = p.object({ foo: p.string() });
        const modified = original.strip();
        expect(modified).not.toBe(original);
        const branched = modified.strict();
        expect(branched).not.toEqual(modified);
    });

    it('returns undefined when object is unmodified', () => {
        const schema = p.object({ foo: p.string() }).strip();
        const data = Object.freeze({ foo: 'bar' });

        const issueOrSuccess = schema._parse(data);
        expect(issueOrSuccess).toBe(undefined);
    });

    it('returns new value when child is modified', () => {
        const schema = p.object({ child: p.object({ foo: p.string() }).strip() }).strip();
        const data = Object.freeze({ child: { foo: 'bar', extra: 'baz' } });

        const issueOrSuccess = schema._parse(data);
        expect(issueOrSuccess).toEqual({ ok: true, value: { child: { foo: 'bar' } } });
    });

    it('preserves transform when child is transformed to undefined', () => {
        const schema = p
            .object({
                foo: p.string().chain(p.unknown(), () => p.ok(undefined)),
            })
            .strip();
        const data = { foo: 'bar', extra: 'baz' };

        const result = schema.safeParse(data);
        if (result.ok) {
            expect(result.value).toEqual({ foo: undefined });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('does not strip keys that collide with Object.prototype names', () => {
        const prototypeKeys = [...Object.getOwnPropertyNames(Object.getPrototypeOf({})), '__proto__'];

        fc.assert(
            fc.property(fc.constantFrom(...prototypeKeys), (protoKey) => {
                const schema = p.object({ [protoKey]: p.string() }).strip();
                const data = Object.create(null);
                data[protoKey] = 'valid';
                data.extra = 'strip me';

                const result = schema.safeParse(data);
                if (result.ok) {
                    const expected = Object.create(null);
                    expected[protoKey] = 'valid';
                    expect(result.value).toEqual(expected);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    // In Annex B environments (browsers, Node.js), __proto__ is an accessor on Object.prototype. Bracket-notation
    // assignment on a plain {} triggers the setter instead of creating an own property, which can cause __proto__ to
    // bypass unrecognized-key detection and strip-mode sanitization. These tests use Object.create(null) for input data
    // (where __proto__ is a regular own property) to verify the schema handles the key correctly regardless of runtime.
    it('strips unrecognized __proto__ key without modified children', () => {
        const schema = p.object({ name: p.string() }).strip();
        const data = Object.create(null);
        data.name = 'alice';
        data.__proto__ = { isAdmin: true };

        const result = schema.safeParse(data);
        if (result.ok) {
            expect(result.value).toEqual({ name: 'alice' });
            expect(Object.hasOwn(result.value, '__proto__')).toBe(false);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('strips unrecognized __proto__ key with modified children', () => {
        const schema = p.object({ child: p.object({ foo: p.string() }).strip() }).strip();
        const data = Object.create(null);
        data.child = { foo: 'bar', extra: 'baz' };
        data.__proto__ = { isAdmin: true };

        const result = schema.safeParse(data);
        if (result.ok) {
            expect(result.value).toEqual({ child: { foo: 'bar' } });
            expect(Object.hasOwn(result.value, '__proto__')).toBe(false);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });
});

describe('strict', () => {
    it('rejects unrecognised keys', () => {
        const schema = p.object({
            foo: p.string(),
            bar: p.object({
                baz: p.number(),
            }),
        });

        fc.assert(
            fc.property(
                fc.record({
                    foo: fc.string(),
                    bar: fc.record({ baz: fc.float({ noNaN: true }), extra2: fc.anything() }),
                    extra1: fc.anything(),
                }),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([
                            { path: ['bar', 'extra2'], message: 'Unrecognised key.' },
                            { path: ['extra1'], message: 'Unrecognised key.' },
                        ]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('is immutable', () => {
        const original = p.object({ foo: p.string() });
        const modified = original.strict();
        expect(modified).not.toBe(original);
        const branched = modified.passthrough();
        expect(branched).not.toEqual(modified);
    });

    it('returns undefined when object is unmodified', () => {
        const schema = p.object({ foo: p.string() });
        const data = Object.freeze({ foo: 'bar' });

        const issueOrSuccess = schema._parse(data);
        expect(issueOrSuccess).toBe(undefined);
    });

    it('does not crash on Object.prototype keys', () => {
        const prototypeKeys = [...Object.getOwnPropertyNames(Object.getPrototypeOf({})), '__proto__'];

        fc.assert(
            fc.property(fc.constantFrom(...prototypeKeys), (protoKey) => {
                const schema = p.object({ name: p.string() });
                const data = Object.create(null);
                data.name = 'alice';
                data[protoKey] = 'boom';

                const result = schema.safeParse(data);
                expect(result.ok).toBeFalsy();
            }),
        );
    });

    it('only flags truly unrecognized keys, not Object.prototype collisions', () => {
        const prototypeKeys = [...Object.getOwnPropertyNames(Object.getPrototypeOf({})), '__proto__'];

        fc.assert(
            fc.property(fc.constantFrom(...prototypeKeys), (protoKey) => {
                const schema = p.object({ [protoKey]: p.string() });
                const data = Object.create(null);
                data[protoKey] = 'valid';
                data.extra = 'unrecognized';

                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: ['extra'], message: 'Unrecognised key.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });
});

describe('passthrough', () => {
    it('passes through unrecognised keys', () => {
        const schema = p
            .object({
                foo: p.string(),
                bar: p
                    .object({
                        baz: p.number(),
                    })
                    .passthrough(),
            })
            .passthrough();

        fc.assert(
            fc.property(
                fc.record({
                    foo: fc.string(),
                    bar: fc.record({ baz: fc.float({ noNaN: true }), extra2: fc.anything() }),
                    extra1: fc.anything(),
                }),
                (data) => {
                    const result = schema.safeParse(data);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<{ foo: string; bar: { baz: number } }>;
                        expect(result.value).toEqual(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('is immutable', () => {
        const original = p.object({ foo: p.string() });
        const modified = original.passthrough();
        expect(modified).not.toBe(original);
        const branched = modified.strip();
        expect(branched).not.toEqual(modified);
    });

    it('returns undefined when object is unmodified', () => {
        const schema = p.object({ foo: p.string() }).passthrough();
        const data = Object.freeze({ foo: 'bar' });

        const issueOrSuccess = schema._parse(data);
        expect(issueOrSuccess).toBe(undefined);
    });
});

it('rejects missing keys', () => {
    const schema = p.object({
        child1: p.string(),
        child2: p.string(),
        child3: p.string(),
    });
    const data = Object.freeze({ child2: 'hello' });

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([
            { path: ['child1'], message: 'Missing value.' },
            { path: ['child3'], message: 'Missing value.' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('rejects deeply missing keys', () => {
    const schema = p.object({
        string1: p.string(),
        object1: p.object({ string2: p.string(), number1: p.number() }),
        object2: p.object({
            object3: p.object({ string3: p.string(), number2: p.number() }),
        }),
    });
    const data = Object.freeze({
        object1: { string2: 'world' },
        object2: { object3: { string3: 'abc' } },
    });

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([
            { path: ['object1', 'number1'], message: 'Missing value.' },
            { path: ['object2', 'object3', 'number2'], message: 'Missing value.' },
            { path: ['string1'], message: 'Missing value.' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('flags required keys matching Object.prototype properties as missing', () => {
    const prototypeKeys = [...Object.getOwnPropertyNames(Object.getPrototypeOf({})), '__proto__'];

    fc.assert(
        fc.property(fc.constantFrom(...prototypeKeys), (protoKey) => {
            const schema = p.object({ [protoKey]: p.string() });

            const result = schema.safeParse({});
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [protoKey], message: 'Missing value.' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

it('does not flag optional keys as missing', () => {
    const schema = p.object({ optional: p.string().optional(), required: p.string() });
    const data = Object.freeze({});

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: ['required'], message: 'Missing value.' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('does not flag optional-wrapped-in-nullable as missing', () => {
    const schema = p.object({ field: p.string().optional().nullable(), required: p.string() });
    const data = { required: 'hello' };

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual({ required: 'hello' });
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('treats chained optional as required', () => {
    const schema = p.object({
        field: p
            .string()
            .optional()
            .chain(p.string(), (v) => p.ok(v ?? 'default')),
        required: p.string(),
    });
    const data = { required: 'hello' };

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: ['field'], message: 'Missing value.' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('accepts optional values', () => {
    const schema = p
        .object({
            foo: p.string(),
            bar: p
                .object({
                    baz: p.number(),
                })
                .optional(),
            bif: p.number().optional(),
        })
        .optional();

    fc.assert(
        fc.property(
            fc.option(
                fc.record({
                    foo: fc.string(),
                    bar: fc.option(fc.record({ baz: fc.float({ noNaN: true }) }), { nil: undefined }),
                    bif: fc.integer(),
                }),
                { nil: undefined },
            ),
            (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<
                        { foo: string; bar?: { baz: number }; bif?: number } | undefined
                    >;
                    expect(result.value).toEqual(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

it('accepts nullable values', () => {
    const schema = p
        .object({
            foo: p.string(),
            bar: p
                .object({
                    baz: p.number(),
                })
                .nullable(),
        })
        .nullable();

    fc.assert(
        fc.property(
            fc.option(
                fc.record({
                    foo: fc.string(),
                    bar: fc.option(fc.record({ baz: fc.float({ noNaN: true }) }), { nil: null }),
                }),
                { nil: null },
            ),
            (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<{ foo: string; bar: { baz: number } | null } | null>;
                    expect(result.value).toEqual(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

describe('merge', () => {
    it('merges without overlap', () => {
        const schema = p.object({ foo: p.number() });
        const schemaOther = p.object({ bar: p.string() });
        const schemaMerged = schema.merge(schemaOther);

        fc.assert(
            fc.property(fc.record({ foo: fc.float({ noNaN: true }), bar: fc.string() }), (data) => {
                const result = schemaMerged.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<{ foo: number; bar: string }>;
                    expect(result.value).toEqual(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('merges with overlap', () => {
        const schema = p.object({ foo: p.number() });
        const schemaOther = p.object({ foo: p.string() });
        const schemaMerged = schema.merge(schemaOther);

        fc.assert(
            fc.property(fc.record({ foo: fc.string() }), (data) => {
                const result = schemaMerged.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<{ foo: string }>;
                    expect(result.value).toEqual(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('adopts strip from merged schema', () => {
        const schema = p.object({ foo: p.string() }).strict();
        const schemaOther = p.object({ foo: p.number() }).strip();
        const schemaMerged = schema.merge(schemaOther);

        const result = schemaMerged.parse({ foo: 123, bar: 'hello' });
        expect(result).toEqual({ foo: 123 });
    });

    it('adopts strict from merged schema', () => {
        const schema = p.object({ foo: p.string() }).strip();
        const schemaOther = p.object({ foo: p.number() }).strict();
        const schemaMerged = schema.merge(schemaOther);

        expect(() => {
            schemaMerged.parse({ foo: 123, bar: 'hello' });
        }).toThrow('Failed to parse. See `e.messages()` for details.');
    });

    it('adopts passthrough from merged schema', () => {
        const schema = p.object({ foo: p.string() }).strict();
        const schemaOther = p.object({ foo: p.number() }).passthrough();
        const schemaMerged = schema.merge(schemaOther);

        const result = schemaMerged.parse({ foo: 123, bar: 'hello' });
        expect(result).toEqual({ foo: 123, bar: 'hello' });
    });

    it('is immutable', () => {
        const original = p.object({ foo: p.string() });
        const merged = original.merge(p.object({ bar: p.number() }));
        expect(merged).not.toBe(original);
    });
});

describe('pick', () => {
    it('picks specified keys', () => {
        const schema = p.object({ foo: p.string(), bar: p.number() });
        const schemaPicked = schema.pick('foo');

        const data = { foo: 'hello' };
        const result = schemaPicked.safeParse(data);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<{ foo: string }>;
            expect(result.value).toEqual(data);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('is immutable', () => {
        const original = p.object({ foo: p.string(), bar: p.number() });
        const picked = original.pick('foo');
        expect(picked).not.toBe(original);
    });
});

describe('omit', () => {
    it('omits specified keys', () => {
        const schema = p.object({ foo: p.string(), bar: p.number() });
        const schemaOmitted = schema.omit('foo');

        const data = { bar: 123 };
        const result = schemaOmitted.safeParse(data);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<{ bar: number }>;
            expect(result.value).toEqual(data);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('is immutable', () => {
        const original = p.object({ foo: p.string(), bar: p.number() });
        const omitted = original.omit('foo');
        expect(omitted).not.toBe(original);
    });
});
