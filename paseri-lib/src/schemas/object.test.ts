import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';
import type { TreeNode } from '../issue.ts';

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
                    expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_type' });
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Strip', () => {
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
    const schema = p
        .object({
            foo: p.string(),
            bar: p
                .object({
                    baz: p.number(),
                })
                .strict(),
        })
        .strict();

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
                    const expectedResult: TreeNode = {
                        type: 'join',
                        left: {
                            type: 'nest',
                            key: 'bar',
                            child: { type: 'nest', key: 'extra2', child: { type: 'leaf', code: 'unrecognized_key' } },
                        },
                        right: { type: 'nest', key: 'extra1', child: { type: 'leaf', code: 'unrecognized_key' } },
                    };
                    expect(result.issue).toEqual(expectedResult);
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
        const expectedResult: TreeNode = {
            type: 'join',
            left: { type: 'nest', key: 'child1', child: { type: 'leaf', code: 'missing_value' } },
            right: { type: 'nest', key: 'child3', child: { type: 'leaf', code: 'missing_value' } },
        };
        expect(result.issue).toEqual(expectedResult);
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
        const expectedResult: TreeNode = {
            type: 'join',
            left: {
                type: 'join',
                left: {
                    type: 'nest',
                    key: 'object1',
                    child: { type: 'nest', key: 'number1', child: { type: 'leaf', code: 'missing_value' } },
                },
                right: {
                    type: 'nest',
                    key: 'object2',
                    child: {
                        type: 'nest',
                        key: 'object3',
                        child: {
                            type: 'nest',
                            key: 'number2',
                            child: {
                                type: 'leaf',
                                code: 'missing_value',
                            },
                        },
                    },
                },
            },
            right: {
                type: 'nest',
                key: 'string1',
                child: { type: 'leaf', code: 'missing_value' },
            },
        };
        expect(result.issue).toEqual(expectedResult);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Optional key is not flagged as missing', () => {
    const schema = p.object({ optional: p.string().optional(), required: p.string() });
    const data = Object.freeze({});

    const result = schema.safeParse(data);
    if (!result.ok) {
        const expectedResult: TreeNode = {
            type: 'nest',
            key: 'required',
            child: {
                type: 'leaf',
                code: 'missing_value',
            },
        };
        expect(result.issue).toEqual(expectedResult);
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
        const schema = p.object({ foo: p.string() });
        const data = Object.freeze({ foo: 'bar' });

        const issueOrSuccess = schema._parse(data);
        expect(issueOrSuccess).toBe(undefined);
    });

    await t.step('Strict success returns undefined', () => {
        const schema = p.object({ foo: p.string() }).strict();
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
        const schema = p.object({ child: p.object({ foo: p.string() }) });
        const data = Object.freeze({ child: { foo: 'bar', extra: 'baz' } });

        const issueOrSuccess = schema._parse(data);
        expect(issueOrSuccess).toEqual({ ok: true, value: { child: { foo: 'bar' } } });
    });
});

test('Immutable', async (t) => {
    await t.step('strict', () => {
        const original = p.object({ foo: p.string() });
        const modified = original.strict();
        expect(modified).not.toEqual(original);
    });

    await t.step('passthrough', () => {
        const original = p.object({ foo: p.string() });
        const modified = original.passthrough();
        expect(modified).not.toEqual(original);
    });
});
