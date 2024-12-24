import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.object({ foo: p.string() });

    fc.assert(
        fc.property(fc.record({ foo: fc.string() }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<{ foo: string }>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid type', () => {
    const schema = p.object({ foo: p.string() });

    fc.assert(
        fc.property(
            fc.anything().filter((value) => !(typeof value === 'object' && value !== null)),
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

test('Strip', () => {
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
                bar: fc.record({ baz: fc.float(), extra2: fc.anything() }),
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

test('Strict', () => {
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
                bar: fc.record({ baz: fc.float(), extra2: fc.anything() }),
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

test('Passthrough', () => {
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
                bar: fc.record({ baz: fc.float(), extra2: fc.anything() }),
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

test('Missing keys', () => {
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

test('Deep missing keys', () => {
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

test('Optional key is not flagged as missing', () => {
    const schema = p.object({ optional: p.string().optional(), required: p.string() });
    const data = Object.freeze({});

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: ['required'], message: 'Missing value.' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Optional', () => {
    const schema = p
        .object({
            foo: p.string(),
            bar: p
                .object({
                    baz: p.number(),
                })
                .optional(),
        })
        .optional();

    fc.assert(
        fc.property(
            fc.option(
                fc.record({
                    foo: fc.string(),
                    bar: fc.option(fc.record({ baz: fc.float() }), { nil: undefined }),
                }),
                { nil: undefined },
            ),
            (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<
                        { foo: string; bar: { baz: number } | undefined } | undefined
                    >;
                    expect(result.value).toEqual(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Nullable', () => {
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
                    bar: fc.option(fc.record({ baz: fc.float() }), { nil: null }),
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

test('White-box', async (t) => {
    await t.step('Strip success returns undefined', () => {
        const schema = p.object({ foo: p.string() }).strip();
        const data = Object.freeze({ foo: 'bar' });

        const issueOrSuccess = schema._parse(data);
        expect(issueOrSuccess).toBe(undefined);
    });

    await t.step('Strict success returns undefined', () => {
        const schema = p.object({ foo: p.string() });
        const data = Object.freeze({ foo: 'bar' });

        const issueOrSuccess = schema._parse(data);
        expect(issueOrSuccess).toBe(undefined);
    });

    await t.step('Passthrough success returns undefined', () => {
        const schema = p.object({ foo: p.string() }).passthrough();
        const data = Object.freeze({ foo: 'bar' });

        const issueOrSuccess = schema._parse(data);
        expect(issueOrSuccess).toBe(undefined);
    });

    await t.step('Modified child returns new value', () => {
        const schema = p.object({ child: p.object({ foo: p.string() }).strip() }).strip();
        const data = Object.freeze({ child: { foo: 'bar', extra: 'baz' } });

        const issueOrSuccess = schema._parse(data);
        expect(issueOrSuccess).toEqual({ ok: true, value: { child: { foo: 'bar' } } });
    });
});

test('Immutable', async (t) => {
    await t.step('strip', () => {
        const original = p.object({ foo: p.string() });
        const modified = original.strip();
        expect(modified).not.toBe(original);
    });

    await t.step('strict', () => {
        const original = p.object({ foo: p.string() });
        const modified = original.strict();
        expect(modified).not.toBe(original);
    });

    await t.step('passthrough', () => {
        const original = p.object({ foo: p.string() });
        const modified = original.passthrough();
        expect(modified).not.toBe(original);
    });
});
