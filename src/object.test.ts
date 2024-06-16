import { expect } from '@std/expect';
import * as s from '../src/index.ts';
import type { TreeNode } from './issue.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = s.object({
        string1: s.string(),
        object1: s.object({ string2: s.string(), number1: s.number() }),
        object2: s.object({
            object3: s.object({ string3: s.string(), number2: s.number() }),
        }),
    });
    const schemaStrict = s
        .object({
            string1: s.string(),
            object1: s.object({ string2: s.string(), number1: s.number() }).strict(),
            object2: s
                .object({
                    object3: s.object({ string3: s.string(), number2: s.number() }).strict(),
                })
                .strict(),
        })
        .strict();

    await t.step('Valid', () => {
        const result = schema.safeParse({
            string1: 'hello',
            object1: { string2: 'world', number1: 123 },
            object2: { object3: { string3: 'abc', number2: 456 } },
        });
        if (result.ok) {
            expect(result.value).toEqual({
                string1: 'hello',
                object1: { string2: 'world', number1: 123 },
                object2: { object3: { string3: 'abc', number2: 456 } },
            });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Missing keys', () => {
        const result = schema.safeParse({
            object1: { string2: 'world' },
            object2: { object3: { string3: 'abc' } },
        });
        if (!result.ok) {
            const expectedResult: TreeNode = {
                type: 'join',
                left: {
                    type: 'join',
                    left: {
                        type: 'nest',
                        key: 'string1',
                        child: { type: 'leaf', code: 'missing_value' },
                    },
                    right: {
                        type: 'nest',
                        key: 'object1',
                        child: {
                            type: 'nest',
                            key: 'number1',
                            child: { type: 'leaf', code: 'missing_value' },
                        },
                    },
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
                            child: { type: 'leaf', code: 'missing_value' },
                        },
                    },
                },
            };

            expect(result.issue).toEqual(expectedResult);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Extra keys', () => {
        const result = schema.safeParse({
            string1: 'hello',
            bad1: 'BAD',
            object1: { string2: 'world', number1: 123, bad2: 'BAD' },
            object2: { object3: { string3: 'abc', number2: 456, bad3: 'BAD' } },
        });
        if (result.ok) {
            expect(result.value).toEqual({
                string1: 'hello',
                object1: { string2: 'world', number1: 123 },
                object2: { object3: { string3: 'abc', number2: 456 } },
            });
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Extra keys strict', () => {
        const result = schemaStrict.safeParse({
            string1: 'hello',
            bad1: 'BAD',
            object1: { string2: 'world', number1: 123, bad2: 'BAD' },
            object2: { object3: { string3: 'abc', number2: 456, bad3: 'BAD' } },
        });
        if (!result.ok) {
            const expectedResult: TreeNode = {
                type: 'join',
                left: {
                    type: 'join',
                    left: {
                        type: 'nest',
                        key: 'object1',
                        child: {
                            type: 'nest',
                            key: 'bad2',
                            child: {
                                type: 'leaf',
                                code: 'unrecognized_key',
                            },
                        },
                    },
                    right: {
                        type: 'nest',
                        key: 'object2',
                        child: {
                            type: 'nest',
                            key: 'object3',
                            child: {
                                type: 'nest',
                                key: 'bad3',
                                child: {
                                    type: 'leaf',
                                    code: 'unrecognized_key',
                                },
                            },
                        },
                    },
                },
                right: {
                    type: 'nest',
                    key: 'bad1',
                    child: {
                        type: 'leaf',
                        code: 'unrecognized_key',
                    },
                },
            };

            expect(result.issue).toEqual(expectedResult);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Invalid child value', () => {
        const result = schema.safeParse({
            string1: 123,
            object1: { string2: 'world', number1: 123 },
            object2: { object3: { string3: 'abc', number2: 456 } },
        });
        if (!result.ok) {
            const expectedResult: TreeNode = {
                type: 'nest',
                key: 'string1',
                child: {
                    type: 'leaf',
                    code: 'invalid_type',
                },
            };

            expect(result.issue).toEqual(expectedResult);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Invalid deep child value', () => {
        const result = schema.safeParse({
            string1: 'hello',
            object1: { string2: 456, number1: 123 },
            object2: { object3: { string3: null, number2: 456 } },
        });
        if (!result.ok) {
            const expectedResult: TreeNode = {
                type: 'join',
                left: {
                    type: 'nest',
                    key: 'object1',
                    child: {
                        type: 'nest',
                        key: 'string2',
                        child: {
                            type: 'leaf',
                            code: 'invalid_type',
                        },
                    },
                },
                right: {
                    type: 'nest',
                    key: 'object2',
                    child: {
                        type: 'nest',
                        key: 'object3',
                        child: {
                            type: 'nest',
                            key: 'string3',
                            child: {
                                type: 'leaf',
                                code: 'invalid_type',
                            },
                        },
                    },
                },
            };

            expect(result.issue).toEqual(expectedResult);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Not an object', () => {
        const result = schema.safeParse(null);
        if (!result.ok) {
            const expectedResult: TreeNode = { type: 'leaf', code: 'invalid_type' };

            expect(result.issue).toEqual(expectedResult);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Deep not an object', () => {
        const result = schema.safeParse({
            string1: 'hello',
            object1: null,
            object2: { object3: null },
        });
        if (!result.ok) {
            const expectedResult: TreeNode = {
                type: 'join',
                left: {
                    type: 'nest',
                    key: 'object1',
                    child: {
                        type: 'leaf',
                        code: 'invalid_type',
                    },
                },
                right: {
                    type: 'nest',
                    key: 'object2',
                    child: {
                        type: 'nest',
                        key: 'object3',
                        child: {
                            type: 'leaf',
                            code: 'invalid_type',
                        },
                    },
                },
            };

            expect(result.issue).toEqual(expectedResult);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});
