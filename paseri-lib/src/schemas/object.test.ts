import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';
import { isPlainObject } from '../utils.ts';

it('accepts valid types', () => {
    const schema = p.object({ foo: p.string(), 1: p.number() });

    fc.assert(
        fc.property(fc.record({ foo: fc.string(), 1: fc.float({ noNaN: true }) }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<{ foo: string; 1: number }>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('infers key optionality from the schema kind, not the value type', () => {
    const schema = p.object({
        plain: p.string().optional(),
        optionalThenNullable: p.string().optional().nullable(),
        nullableThenOptional: p.string().nullable().optional(),
        // Refine delegates `_isOptional` to its base, so an optional base stays an optional key (matching the
        // runtime); chain, which does not delegate, would instead infer a required key.
        optionalThenRefined: p
            .string()
            .optional()
            .refine((value) => value === undefined || value.length > 0, {
                code: 'non_empty',
            }),
        valueUndefined: p.union(p.string(), p.undefined()),
        explicitUndefined: p.undefined(),
        defaulted: p.string().optional().default('x'),
    });

    const result = schema.safeParse({
        plain: 'a',
        optionalThenNullable: null,
        nullableThenOptional: 'b',
        valueUndefined: 'c',
        explicitUndefined: undefined,
    });
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<{
            plain?: string | undefined;
            optionalThenNullable?: string | null | undefined;
            nullableThenOptional?: string | null | undefined;
            optionalThenRefined?: string | undefined;
            valueUndefined: string | undefined;
            explicitUndefined: undefined;
            defaulted: string;
        }>();
        expect(result.value.defaulted).toBe('x');
        // Omitted from the input above: an optional refine key is genuinely absent at runtime, not just typed away.
        expect('optionalThenRefined' in result.value).toBe(false);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('rejects symbol shape keys', () => {
    // Symbol-keyed fields were silently ignored by the parser (never validated, never required) and are
    // unrepresentable in compiled validators, so they are rejected at construction.
    const bar = Symbol.for('bar');
    // @ts-expect-error Intentionally silence the type error to validate runtime check.
    expect(() => p.object({ foo: p.string(), [bar]: p.number() })).toThrow('Object fields must use string keys.');
    // @ts-expect-error Intentionally silence the type error to validate runtime check.
    expect(() => p.object({ [bar]: p.number() })).toThrow('Object fields must use string keys.');
});

it('rejects invalid types', () => {
    const schema = p.object({ foo: p.string() });

    fc.assert(
        fc.property(
            fc.anything({ withDate: true, withSet: true, withMap: true }).filter((value) => !isPlainObject(value)),
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

it('exposes the shape', () => {
    const shape = { foo: p.string(), bar: p.number(), baz: p.literal(123n) };
    const schema = p.object(shape);
    expectTypeOf(schema.shape).toEqualTypeOf<typeof shape>();
});

it('rejects a plain-looking object whose own constructor is undefined', () => {
    const schema = p.object({ a: p.number() }).passthrough();
    const result = schema.safeParse({ a: 1, constructor: undefined });
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'invalid_type' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('rejects a constructor-undefined object when the schema has a default field', () => {
    // A default field with passthrough mode takes the fast path whose object gate must reject a plain-looking
    // object whose own constructor is undefined — passthrough keeps the extra key, so the gate is the sole guard.
    const schema = p.object({ a: p.string(), b: p.number().optional().default(5) }).passthrough();
    const result = schema.safeParse({ a: 'x', constructor: undefined });
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'invalid_type' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('rejects an array whose prototype was reset to Object.prototype', () => {
    const schema = p.object({ a: p.number() });
    const value: unknown[] = [];
    Object.setPrototypeOf(value, Object.prototype);
    const result = schema.safeParse(value);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'invalid_type' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('rejects a nested constructor-undefined object through a shape-checkable record field', () => {
    const schema = p.object({ inner: p.record(p.unknown()) });
    const result = schema.safeParse({ inner: { constructor: undefined } });
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: ['inner'], message: 'invalid_type' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('reports all sibling field errors (order is not contractual)', () => {
    // The relative order of sibling field errors is not part of the contract; assert the set (sorted) so the test
    // is order-agnostic.
    const schema = p.object({ a: p.string(), b: p.string() });
    const result = schema.safeParse({ b: 123, a: 456 });
    if (!result.ok) {
        const sorted = [...result.messages()].sort((x, y) => String(x.path).localeCompare(String(y.path)));
        expect(sorted).toEqual([
            { path: ['a'], message: 'invalid_type' },
            { path: ['b'], message: 'invalid_type' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('rejects empty object', () => {
    // @ts-expect-error Intentionally silence the type error to validate runtime check.
    expect(() => p.object()).toThrow('Object must contain at least one field.');
    // @ts-expect-error Intentionally silence the type error to validate runtime check.
    expect(() => p.object({})).toThrow('Object must contain at least one field.');
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
                        expectTypeOf(result.value).toEqualTypeOf<{ foo: string; bar: { baz: number } }>();
                        const expectedResult = { foo: data.foo, bar: { baz: data.bar.baz } };
                        expect(result.value).toEqual(expectedResult);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('strips an unrecognised key when an optional field is absent', () => {
        // Mirror of the strict-mode regression: the unknown key and the absent optional cancel out
        // in key count, so the sanitiser must still remove the unknown key.
        const schema = p.object({ foo: p.string(), bar: p.string().optional() }).strip();

        const result = schema.safeParse({ foo: 'hello', extra: 'boom' });
        if (result.ok) {
            expect(result.value).toEqual({ foo: 'hello' });
        } else {
            expect(result.ok).toBeTruthy();
        }
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

        // White-box: the unmodified fast path returns `undefined` (not a wrapped result), observable only via _parse.
        const issueOrSuccess = schema._parse(data, 0, 1000);
        expect(issueOrSuccess).toBe(undefined);
    });

    it('returns new value when child is modified', () => {
        const schema = p.object({ child: p.object({ foo: p.string() }).strip() }).strip();
        const data = Object.freeze({ child: { foo: 'bar', extra: 'baz' } });

        const result = schema.safeParse(data);
        if (result.ok) {
            expect(result.value).toEqual({ child: { foo: 'bar' } });
        } else {
            expect(result.ok).toBeTruthy();
        }
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
    // bypass unrecognised-key detection and strip-mode sanitisation. These tests use Object.create(null) for input data
    // (where __proto__ is a regular own property) to verify the schema handles the key correctly regardless of runtime.
    it('sanitises a strip child under a __proto__ key', () => {
        // Regression: the sanitised child was assigned into the internal accumulator's __proto__ slot in
        // Annex B environments, so the original child (junk included) survived in the output.
        const schema = p.object({ ['__proto__']: p.object({ a: p.number() }).strip(), other: p.string() });
        const data = Object.create(null);
        // biome-ignore lint/complexity/useLiteralKeys lint/suspicious/noProto: __proto__ is the key under test; see the block comment above. biomejs/biome#10769
        data['__proto__'] = { a: 1, junk: 2 };
        data.other = 'x';

        const result = schema.safeParse(data);
        if (result.ok) {
            expect(Object.getOwnPropertyDescriptor(result.value, '__proto__')?.value).toEqual({ a: 1 });
            expect(Object.getPrototypeOf(result.value)).toBe(Object.prototype);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('strips unrecognised __proto__ key without modified children', () => {
        const schema = p.object({ name: p.string() }).strip();
        const data = Object.create(null);
        data.name = 'alice';
        // biome-ignore lint/suspicious/noProto: __proto__ is the key under test; see the block comment above. biomejs/biome#10769
        data.__proto__ = { isAdmin: true };

        const result = schema.safeParse(data);
        if (result.ok) {
            expect(result.value).toEqual({ name: 'alice' });
            expect(Object.hasOwn(result.value, '__proto__')).toBe(false);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('strips unrecognised __proto__ key with modified children', () => {
        const schema = p.object({ child: p.object({ foo: p.string() }).strip() }).strip();
        const data = Object.create(null);
        data.child = { foo: 'bar', extra: 'baz' };
        // biome-ignore lint/suspicious/noProto: __proto__ is the key under test; see the block comment above. biomejs/biome#10769
        data.__proto__ = { isAdmin: true };

        const result = schema.safeParse(data);
        if (result.ok) {
            expect(result.value).toEqual({ child: { foo: 'bar' } });
            expect(Object.hasOwn(result.value, '__proto__')).toBe(false);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('rejects an extra key in a nested strict object alongside a defaulted sibling', () => {
        // The defaulted sibling is omitted, so its default fires; the nested strict object must still reject
        // its own unknown key.
        const schema = p
            .object({
                kept: p.number().optional().default(5),
                nested: p.object({ x: p.number() }).strict(),
            })
            .strip();

        const result = schema.safeParse({ nested: { x: 1, extra: 999 } });
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: ['nested', 'extra'], message: 'unrecognized_key' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('fills a default and keeps a clean nested strict object', () => {
        const schema = p
            .object({
                kept: p.number().optional().default(5),
                nested: p.object({ x: p.number() }).strict(),
            })
            .strip();

        const result = schema.safeParse({ nested: { x: 1 } });
        if (result.ok) {
            expect(result.value).toEqual({ kept: 5, nested: { x: 1 } });
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
                            { path: ['bar', 'extra2'], message: 'unrecognized_key' },
                            { path: ['extra1'], message: 'unrecognized_key' },
                        ]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('rejects an unrecognised key when an optional field is absent', () => {
        // The unknown key and the absent optional cancel out in key count, so extras detection
        // must not rely on the key count alone.
        const schema = p.object({ foo: p.string(), bar: p.string().optional() });

        const result = schema.safeParse({ foo: 'hello', extra: 'boom' });
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: ['extra'], message: 'unrecognized_key' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('rejects an extra key in a nested strict object alongside a defaulted sibling', () => {
        // The defaulted sibling is omitted, so its default fires; the nested strict object must still reject
        // its own unknown key.
        const schema = p.object({
            kept: p.number().optional().default(5),
            nested: p.object({ x: p.number() }).strict(),
        });

        const result = schema.safeParse({ nested: { x: 1, extra: 999 } });
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: ['nested', 'extra'], message: 'unrecognized_key' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('fills a default and keeps a clean nested strict object', () => {
        const schema = p.object({
            kept: p.number().optional().default(5),
            nested: p.object({ x: p.number() }).strict(),
        });

        const result = schema.safeParse({ nested: { x: 1 } });
        if (result.ok) {
            expect(result.value).toEqual({ kept: 5, nested: { x: 1 } });
        } else {
            expect(result.ok).toBeTruthy();
        }
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

        // White-box: the unmodified fast path returns `undefined` (not a wrapped result), observable only via _parse.
        const issueOrSuccess = schema._parse(data, 0, 1000);
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

    it('only flags truly unrecognised keys, not Object.prototype collisions', () => {
        const prototypeKeys = [...Object.getOwnPropertyNames(Object.getPrototypeOf({})), '__proto__'];

        fc.assert(
            fc.property(fc.constantFrom(...prototypeKeys), (protoKey) => {
                const schema = p.object({ [protoKey]: p.string() });
                const data = Object.create(null);
                data[protoKey] = 'valid';
                data.extra = 'unrecognized';

                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: ['extra'], message: 'unrecognized_key' }]);
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
                        expectTypeOf(result.value).toEqualTypeOf<{ foo: string; bar: { baz: number } }>();
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

        // White-box: the unmodified fast path returns `undefined` (not a wrapped result), observable only via _parse.
        const issueOrSuccess = schema._parse(data, 0, 1000);
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
            { path: ['child1'], message: 'missing_value' },
            { path: ['child3'], message: 'missing_value' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('rejects missing required fields whose schemas accept undefined', () => {
    // `unknown`/`undefined` field schemas accept the value `undefined`, but a missing key is still missing.
    const schema = p.object({ child1: p.unknown(), child2: p.undefined() });
    const result = schema.safeParse({});
    if (!result.ok) {
        const sorted = [...result.messages()].sort((x, y) => String(x.path).localeCompare(String(y.path)));
        expect(sorted).toEqual([
            { path: ['child1'], message: 'missing_value' },
            { path: ['child2'], message: 'missing_value' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('rejects an object whose only key is unrecognised when the missing field accepts undefined', () => {
    const schema = p.object({ child1: p.unknown() });
    const result = schema.safeParse({ other: 1 });
    if (!result.ok) {
        const sorted = [...result.messages()].sort((x, y) => String(x.path).localeCompare(String(y.path)));
        expect(sorted).toEqual([
            { path: ['child1'], message: 'missing_value' },
            { path: ['other'], message: 'unrecognized_key' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('validates a non-enumerable own required field against its schema', () => {
    const schema = p.object({ visible: p.string(), hidden: p.number() });
    const data: Record<string, unknown> = { visible: 'ok' };
    Object.defineProperty(data, 'hidden', { value: 'not a number', enumerable: false });

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: ['hidden'], message: 'invalid_type' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('validates a non-enumerable own field masked by an inherited enumerable key', () => {
    // An inherited enumerable key must not offset the hidden-own-key count and skip validation of the own
    // non-enumerable field. Passthrough keeps the inherited key from raising an unrecognised-key issue.
    const schema = p.object({ visible: p.string(), hidden: p.number() }).passthrough();
    const data: Record<string, unknown> = Object.create({ inherited: 'x' });
    data.visible = 'ok';
    Object.defineProperty(data, 'hidden', { value: 'not a number', enumerable: false });

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: ['hidden'], message: 'invalid_type' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('accepts a conforming non-enumerable own required field', () => {
    const schema = p.object({ visible: p.string(), hidden: p.number() });
    const data: Record<string, unknown> = { visible: 'ok' };
    Object.defineProperty(data, 'hidden', { value: 42, enumerable: false });

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value.visible).toBe('ok');
        expect(result.value.hidden).toBe(42);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('keeps a validated non-enumerable own field when stripping unrecognised keys', () => {
    const schema = p.object({ visible: p.string(), hidden: p.number() }).strip();
    const data: Record<string, unknown> = { visible: 'ok', extra: 'drop me' };
    Object.defineProperty(data, 'hidden', { value: 42, enumerable: false, writable: true, configurable: true });

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual({ visible: 'ok', hidden: 42 });
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('validates a non-enumerable own optional field against its schema', () => {
    const schema = p.object({ visible: p.string(), hidden: p.number().optional() });
    const data: Record<string, unknown> = { visible: 'ok' };
    Object.defineProperty(data, 'hidden', { value: 'not a number', enumerable: false });

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: ['hidden'], message: 'invalid_type' }]);
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
            { path: ['object1', 'number1'], message: 'missing_value' },
            { path: ['object2', 'object3', 'number2'], message: 'missing_value' },
            { path: ['string1'], message: 'missing_value' },
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
                expect(result.messages()).toEqual([{ path: [protoKey], message: 'missing_value' }]);
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
        expect(result.messages()).toEqual([{ path: ['required'], message: 'missing_value' }]);
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
            .chain(p.string(), (value) => p.ok(value ?? 'default')),
        required: p.string(),
    });
    const data = { required: 'hello' };

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: ['field'], message: 'missing_value' }]);
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
                        { foo: string; bar?: { baz: number } | undefined; bif?: number | undefined } | undefined
                    >();
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
                    expectTypeOf(result.value).toEqualTypeOf<{ foo: string; bar: { baz: number } | null } | null>();
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
                    expectTypeOf(result.value).toEqualTypeOf<{ foo: number; bar: string }>();
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
                    expectTypeOf(result.value).toEqualTypeOf<{ foo: string }>();
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
            expectTypeOf(result.value).toEqualTypeOf<{ foo: string }>();
            expect(result.value).toEqual(data);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('picks numeric keys', () => {
        const schema = p.object({ 1: p.string(), 2: p.number() });
        const schemaPicked = schema.pick(1);

        const data = { 1: 'hello' };
        const result = schemaPicked.safeParse(data);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<{ 1: string }>();
            expect(result.value).toEqual(data);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('preserves strip mode', () => {
        const schema = p.object({ foo: p.string(), bar: p.number() }).strip().pick('foo');
        const result = schema.safeParse({ foo: 'hi', extra: 'gone' });
        if (result.ok) {
            expect(result.value).toEqual({ foo: 'hi' });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('preserves passthrough mode', () => {
        const schema = p.object({ foo: p.string(), bar: p.number() }).passthrough().pick('foo');
        const result = schema.safeParse({ foo: 'hi', extra: 'kept' });
        if (result.ok) {
            expect(result.value).toEqual({ foo: 'hi', extra: 'kept' });
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
            expectTypeOf(result.value).toEqualTypeOf<{ bar: number }>();
            expect(result.value).toEqual(data);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('omits numeric keys', () => {
        const schema = p.object({ 1: p.string(), 2: p.number() });
        const schemaOmitted = schema.omit(1);

        const data = { 2: 123 };
        const result = schemaOmitted.safeParse(data);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<{ 2: number }>();
            expect(result.value).toEqual(data);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('preserves strip mode', () => {
        const schema = p.object({ foo: p.string(), bar: p.number() }).strip().omit('bar');
        const result = schema.safeParse({ foo: 'hi', extra: 'gone' });
        if (result.ok) {
            expect(result.value).toEqual({ foo: 'hi' });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('preserves passthrough mode', () => {
        const schema = p.object({ foo: p.string(), bar: p.number() }).passthrough().omit('bar');
        const result = schema.safeParse({ foo: 'hi', extra: 'kept' });
        if (result.ok) {
            expect(result.value).toEqual({ foo: 'hi', extra: 'kept' });
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

describe('partial', () => {
    it('makes all fields optional', () => {
        const schema = p.object({ foo: p.string(), bar: p.number() }).partial();
        const result = schema.safeParse({});
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<{ foo?: string | undefined; bar?: number | undefined }>();
            expect(result.value).toEqual({});
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('makes only listed fields optional', () => {
        const schema = p.object({ foo: p.string(), bar: p.number() }).partial('foo');
        const result = schema.safeParse({ bar: 1 });
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<{ foo?: string | undefined; bar: number }>();
            expect(result.value).toEqual({ bar: 1 });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('still requires fields not listed', () => {
        const schema = p.object({ foo: p.string(), bar: p.number() }).partial('foo');
        const result = schema.safeParse({ foo: 'hi' });
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: ['bar'], message: 'missing_value' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('makes only listed numeric-keyed fields optional', () => {
        const schema = p.object({ 1: p.string(), 2: p.number() }).partial(1);
        const result = schema.safeParse({ 2: 5 });
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<{ 1?: string | undefined; 2: number }>();
            expect(result.value).toEqual({ 2: 5 });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('leaves a default field still defaulted', () => {
        const schema = p.object({ port: p.number().optional().default(80) }).partial();
        const result = schema.safeParse({});
        if (result.ok) {
            expect(result.value).toEqual({ port: 80 });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('preserves mode', () => {
        const schema = p.object({ foo: p.string() }).strip().partial();
        const result = schema.safeParse({ foo: 'hi', extra: 'gone' });
        if (result.ok) {
            expect(result.value).toEqual({ foo: 'hi' });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('leaves a wrapped default field required and defaulted', () => {
        // partial() exempts any field with a default (via _hasDefault), not only a bare DefaultSchema, so a
        // refine-wrapped default keeps filling and stays a required key.
        const schema = p
            .object({
                port: p
                    .number()
                    .optional()
                    .default(80)
                    .refine(() => true, { code: 'ok' }),
            })
            .partial();

        const result = schema.safeParse({});
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<{ port: number }>();
            expect(result.value).toEqual({ port: 80 });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('preserves the exact field type of a wrapped default (no phantom optional)', () => {
        // WrapOptional previously widened the kept field to OptionalSchema, whose `.default` is absent at
        // runtime — a type lie. partial() keeps the field verbatim, so the shape type must match.
        const field = p
            .number()
            .optional()
            .default(80)
            .refine(() => true, { code: 'ok' });
        const schema = p.object({ port: field }).partial();
        expectTypeOf(schema.shape.port).toEqualTypeOf<typeof field>();
    });

    it('is immutable', () => {
        const original = p.object({ foo: p.string(), bar: p.number() });
        const partial = original.partial();
        expect(partial).not.toBe(original);
    });
});

describe('required', () => {
    it('requires every field', () => {
        const schema = p.object({ foo: p.string().optional(), bar: p.number().optional() }).required();
        const result = schema.safeParse({ foo: 'hi', bar: 1 });
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<{ foo: string; bar: number }>();
            expect(result.value).toEqual({ foo: 'hi', bar: 1 });
        } else {
            expect(result.ok).toBeTruthy();
        }

        // The unwrapped field keeps its concrete subclass (StringSchema/NumberSchema), not the abstract
        // `Schema<T>` — so subclass methods like `.min` stay chainable. The equality is a compile-time
        // assertion; it would have failed before the OptionalSchema inner-type fix.
        expectTypeOf(schema.shape.foo).toEqualTypeOf<ReturnType<typeof p.string>>();
        expectTypeOf(schema.shape.bar).toEqualTypeOf<ReturnType<typeof p.number>>();
    });

    it('recovers the concrete inner schema through a partial round-trip', () => {
        const schema = p.object({ foo: p.string() }).partial().required();
        expectTypeOf(schema.shape.foo).toEqualTypeOf<ReturnType<typeof p.string>>();
    });

    it('rejects a missing field after required()', () => {
        const schema = p.object({ foo: p.string().optional() }).required();
        const result = schema.safeParse({});
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: ['foo'], message: 'missing_value' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('requires only the listed fields', () => {
        const schema = p.object({ foo: p.string().optional(), bar: p.number().optional() }).required('foo');
        const result = schema.safeParse({ foo: 'hi' });
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<{ foo: string; bar?: number | undefined }>();
            expect(result.value).toEqual({ foo: 'hi' });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('requires only the listed numeric-keyed fields', () => {
        const schema = p.object({ 1: p.string().optional(), 2: p.number().optional() }).required(1);
        const result = schema.safeParse({ 2: 5 });
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: ['1'], message: 'missing_value' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('preserves mode', () => {
        const schema = p.object({ foo: p.string().optional() }).strip().required();
        const result = schema.safeParse({ foo: 'hi', extra: 'gone' });
        if (result.ok) {
            expect(result.value).toEqual({ foo: 'hi' });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('requires an optional field nested in nullable, keeping it nullable', () => {
        // Matches TS `Required`: required() strips the optional layer wherever it sits but leaves nullable
        // intact, so a missing key is rejected while an explicit null is still accepted.
        const schema = p.object({ a: p.string().optional().nullable() }).required();

        const missing = schema.safeParse({});
        if (!missing.ok) {
            expect(missing.messages()).toEqual([{ path: ['a'], message: 'missing_value' }]);
        } else {
            expect(missing.ok).toBeFalsy();
        }

        const withNull = schema.safeParse({ a: null });
        if (withNull.ok) {
            expectTypeOf(withNull.value).toEqualTypeOf<{ a: string | null }>();
            expect(withNull.value).toEqual({ a: null });
        } else {
            expect(withNull.ok).toBeTruthy();
        }
    });

    it('requires an optional field nested in refine, keeping the refinement', () => {
        const schema = p
            .object({
                a: p
                    .string()
                    .optional()
                    .refine((value) => value === undefined || value.length > 1, { code: 'too_short' }),
            })
            .required();

        const missing = schema.safeParse({});
        if (!missing.ok) {
            expect(missing.messages()).toEqual([{ path: ['a'], message: 'missing_value' }]);
        } else {
            expect(missing.ok).toBeFalsy();
        }

        const tooShort = schema.safeParse({ a: 'x' });
        if (!tooShort.ok) {
            expect(tooShort.messages()).toEqual([{ path: ['a'], message: 'too_short' }]);
        } else {
            expect(tooShort.ok).toBeFalsy();
        }

        const valid = schema.safeParse({ a: 'xy' });
        if (valid.ok) {
            expectTypeOf(valid.value).toEqualTypeOf<{ a: string }>();
            expect(valid.value).toEqual({ a: 'xy' });
        } else {
            expect(valid.ok).toBeTruthy();
        }
    });

    it('is immutable', () => {
        const original = p.object({ foo: p.string().optional() });
        const required = original.required();
        expect(required).not.toBe(original);
    });
});

// Wrapping a schema as an object field must validate identically to the bare schema: same acceptance, same
// transformed output, and any issue path simply gains the field key as a prefix. Covers every field kind in a
// nested position, driven generatively rather than with hand-picked inputs.
function expectNestingInvariance<OutputType>(schema: p.Schema<OutputType>, arb: fc.Arbitrary<unknown>): void {
    const nested = p.object({ inner: schema });
    fc.assert(
        fc.property(arb, (value) => {
            const bare = schema.safeParse(value);
            const wrapped = nested.safeParse({ inner: value });
            expect(wrapped.ok).toBe(bare.ok);
            if (bare.ok && wrapped.ok) {
                expect(wrapped.value).toEqual({ inner: bare.value });
            } else if (!bare.ok && !wrapped.ok) {
                const expected = bare.messages().map((issue) => ({
                    path: ['inner', ...issue.path],
                    message: issue.message,
                }));
                expect(wrapped.messages()).toEqual(expected);
            }
        }),
    );
}

describe('nested field validation', () => {
    const cases: { name: string; check: () => void }[] = [
        {
            name: 'string with checks',
            check: () =>
                expectNestingInvariance(
                    p.string().min(2).max(8).includes('a').startsWith('x').endsWith('z'),
                    fc.oneof(fc.string(), fc.constant('xaz')),
                ),
        },
        {
            name: 'string format',
            check: () => expectNestingInvariance(p.string().url(), fc.oneof(fc.webUrl(), fc.string())),
        },
        {
            name: 'number with checks',
            check: () => expectNestingInvariance(p.number().gte(0).lte(100).int(), fc.oneof(fc.integer(), fc.double())),
        },
        {
            name: 'bigint with checks',
            check: () => expectNestingInvariance(p.bigint().gte(0n).lte(100n), fc.bigInt()),
        },
        {
            name: 'nullable',
            check: () => expectNestingInvariance(p.number().nullable(), fc.oneof(fc.double(), fc.constant(null))),
        },
        {
            name: 'optional',
            check: () =>
                expectNestingInvariance(p.string().min(1).optional(), fc.option(fc.string(), { nil: undefined })),
        },
        {
            name: 'default',
            check: () =>
                expectNestingInvariance(p.number().optional().default(5), fc.option(fc.double(), { nil: undefined })),
        },
        {
            name: 'refine',
            check: () =>
                expectNestingInvariance(
                    p.number().refine((value) => value > 0, { code: 'not_positive' }),
                    fc.double(),
                ),
        },
        {
            name: 'enum',
            check: () =>
                expectNestingInvariance(p.enum('a', 'b'), fc.oneof(fc.constantFrom<string>('a', 'b'), fc.string())),
        },
        {
            name: 'array',
            check: () => expectNestingInvariance(p.array(p.number()), fc.array(fc.oneof(fc.double(), fc.string()))),
        },
        {
            name: 'record',
            check: () =>
                expectNestingInvariance(
                    p.record(p.number()),
                    fc.dictionary(fc.string(), fc.oneof(fc.double(), fc.string())),
                ),
        },
        {
            name: 'set',
            check: () =>
                expectNestingInvariance(
                    p.set(p.number()),
                    fc.array(fc.double()).map((values) => new Set(values)),
                ),
        },
        {
            name: 'map',
            check: () =>
                expectNestingInvariance(
                    p.map(p.string(), p.number()),
                    fc.array(fc.tuple(fc.string(), fc.double())).map((entries) => new Map(entries)),
                ),
        },
        {
            name: 'tuple',
            check: () =>
                expectNestingInvariance(
                    p.tuple(p.number(), p.string()),
                    fc.tuple(fc.oneof(fc.double(), fc.string()), fc.string()),
                ),
        },
        {
            name: 'union',
            check: () =>
                expectNestingInvariance(
                    p.union(p.number(), p.string()),
                    fc.oneof(fc.double(), fc.string(), fc.boolean()),
                ),
        },
    ];
    for (const { name, check } of cases) {
        it(name, check);
    }

    // Temporal instances aren't fast-check-friendly, so exercise the nested temporal-type checks with fixed values.
    it('temporal types', () => {
        const schema = p.object({
            inner: p.object({
                date: p.date(),
                duration: p.duration(),
                instant: p.instant(),
                plainDate: p.plainDate(),
                plainDateTime: p.plainDateTime(),
                plainMonthDay: p.plainMonthDay(),
                plainTime: p.plainTime(),
                plainYearMonth: p.plainYearMonth(),
                zonedDateTime: p.zonedDateTime(),
            }),
        });
        const inner = {
            date: new Date('2020-01-01'),
            duration: Temporal.Duration.from({ hours: 1 }),
            instant: Temporal.Instant.from('2020-01-01T00:00:00Z'),
            plainDate: Temporal.PlainDate.from('2020-01-01'),
            plainDateTime: Temporal.PlainDateTime.from('2020-01-01T00:00:00'),
            plainMonthDay: Temporal.PlainMonthDay.from('01-01'),
            plainTime: Temporal.PlainTime.from('00:00:00'),
            plainYearMonth: Temporal.PlainYearMonth.from('2020-01'),
            zonedDateTime: Temporal.ZonedDateTime.from('2020-01-01T00:00:00[UTC]'),
        };
        expect(schema.safeParse({ inner }).ok).toBe(true);

        const result = schema.safeParse({ inner: { ...inner, plainDate: 'not-a-date' } });
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: ['inner', 'plainDate'], message: 'invalid_type' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});
