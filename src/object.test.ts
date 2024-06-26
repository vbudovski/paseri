import { expect } from '@std/expect';
import * as p from '../src/index.ts';
import type { TreeNode } from './issue.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = p.object({
        child: p.string(),
    });

    await t.step('Valid', () => {
        const data = Object.freeze({ child: 'hello' });

        const result = schema.safeParse(data);
        if (result.ok) {
            const expectedResult = { child: 'hello' };
            expect(result.value).toEqual(expectedResult);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Not an object', () => {
        const data = null;

        const result = schema.safeParse(data);
        if (!result.ok) {
            const expectedResult: TreeNode = { type: 'leaf', code: 'invalid_type' };
            expect(result.issue).toEqual(expectedResult);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Flat, strip', () => {
    const schema = p.object({
        child: p.string(),
    });
    const data = Object.freeze({ extra1: 'foo', child: 'hello', extra2: 'bar' });

    const result = schema.safeParse(data);
    if (result.ok) {
        const expectedResult = { child: 'hello' };
        expect(result.value).toEqual(expectedResult);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Deep, strip', () => {
    const schema = p.object({
        child: p.object({
            expected: p.string(),
        }),
    });
    const data = Object.freeze({ child: { extra1: 'foo', expected: 'hello', extra2: 'bar' } });

    const result = schema.safeParse(data);
    if (result.ok) {
        const expectedResult = { child: { expected: 'hello' } };
        expect(result.value).toEqual(expectedResult);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Flat, strict', () => {
    const schema = p
        .object({
            child: p.string(),
        })
        .strict();
    const data = Object.freeze({ extra1: 'foo', child: 'hello', extra2: 'bar' });

    const result = schema.safeParse(data);
    if (!result.ok) {
        const expectedResult: TreeNode = {
            type: 'join',
            left: { type: 'nest', key: 'extra1', child: { type: 'leaf', code: 'unrecognized_key' } },
            right: { type: 'nest', key: 'extra2', child: { type: 'leaf', code: 'unrecognized_key' } },
        };
        expect(result.issue).toEqual(expectedResult);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Deep, strict', () => {
    const schema = p.object({
        child: p.object({ expected: p.string() }).strict(),
    });
    const data = Object.freeze({ child: { extra1: 'foo', expected: 'hello', extra2: 'bar' } });

    const result = schema.safeParse(data);
    if (!result.ok) {
        const expectedResult: TreeNode = {
            type: 'nest',
            key: 'child',
            child: {
                type: 'join',
                left: { type: 'nest', key: 'extra1', child: { type: 'leaf', code: 'unrecognized_key' } },
                right: { type: 'nest', key: 'extra2', child: { type: 'leaf', code: 'unrecognized_key' } },
            },
        };
        expect(result.issue).toEqual(expectedResult);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Flat, passthrough', () => {
    const schema = p
        .object({
            child: p.string(),
        })
        .passthrough();
    const data = Object.freeze({ extra1: 'foo', child: 'hello', extra2: 'bar' });

    const result = schema.safeParse(data);
    if (result.ok) {
        const expectedResult = { extra1: 'foo', child: 'hello', extra2: 'bar' };
        expect(result.value).toEqual(expectedResult);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Deep, passthrough', () => {
    const schema = p.object({
        child: p.object({ expected: p.string() }).passthrough(),
    });
    const data = Object.freeze({ child: { extra1: 'foo', expected: 'hello', extra2: 'bar' } });

    const result = schema.safeParse(data);
    if (result.ok) {
        const expectedResult = { child: { extra1: 'foo', expected: 'hello', extra2: 'bar' } };
        expect(result.value).toEqual(expectedResult);
    } else {
        expect(result.ok).toBeTruthy();
    }
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

test('Optional', () => {
    const schema = p.object({ child: p.string() }).optional();
    const data = undefined;

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toBe(undefined);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Deep optional', () => {
    const schema = p.object({ child: p.string().optional() }).optional();
    const data = Object.freeze({ child: undefined });

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual({ child: undefined });
    } else {
        expect(result.ok).toBeTruthy();
    }
});
