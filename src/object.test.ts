import { expect } from '@std/expect';
import * as s from '../src/index.ts';
import type { TreeNode } from './issue.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = s.object({
        child: s.string(),
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
    const schema = s.object({
        child: s.string(),
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
    const schema = s.object({
        child: s.object({
            expected: s.string(),
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
    const schema = s
        .object({
            child: s.string(),
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
    const schema = s.object({
        child: s.object({ expected: s.string() }).strict(),
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
    const schema = s
        .object({
            child: s.string(),
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
    const schema = s.object({
        child: s.object({ expected: s.string() }).passthrough(),
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
    const schema = s.object({
        child1: s.string(),
        child2: s.string(),
        child3: s.string(),
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
    const schema = s.object({
        string1: s.string(),
        object1: s.object({ string2: s.string(), number1: s.number() }),
        object2: s.object({
            object3: s.object({ string3: s.string(), number2: s.number() }),
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
    const schema = s.object({ child: s.string() }).optional();
    const data = undefined;

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toBe(undefined);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Deep optional', () => {
    const schema = s.object({ child: s.string().optional() }).optional();
    const data = Object.freeze({ child: undefined });

    const result = schema.safeParse(data);
    if (result.ok) {
        expect(result.value).toEqual({ child: undefined });
    } else {
        expect(result.ok).toBeTruthy();
    }
});
