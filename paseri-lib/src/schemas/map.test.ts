import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';
import type { TreeNode } from '../issue.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.map(p.number(), p.string());

    fc.assert(
        fc.property(fc.array(fc.tuple(fc.float(), fc.string())), (data) => {
            const dataAsMap = new Map(data);

            const result = schema.safeParse(dataAsMap);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Map<number, string>>;
                expect(result.value).toEqual(dataAsMap);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid type', () => {
    const schema = p.map(p.number(), p.string());

    fc.assert(
        fc.property(fc.anything(), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_type' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid min', () => {
    const schema = p.map(p.number(), p.string()).min(3);

    fc.assert(
        fc.property(
            fc.array(fc.tuple(fc.float(), fc.string()), { minLength: 3 }).filter((value) => new Map(value).size >= 3),
            (data) => {
                const dataAsMap = new Map(data);

                const result = schema.safeParse(dataAsMap);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Map<number, string>>;
                    expect(result.value).toBe(dataAsMap);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Invalid min', () => {
    const schema = p.map(p.number(), p.string()).min(3);

    fc.assert(
        fc.property(
            fc.array(fc.tuple(fc.float(), fc.string()), { maxLength: 2 }).filter((value) => new Map(value).size <= 2),
            (data) => {
                const dataAsMap = new Map(data);

                const result = schema.safeParse(dataAsMap);
                if (!result.ok) {
                    expect(result.issue).toEqual({ type: 'leaf', code: 'too_short' });
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Valid max', () => {
    const schema = p.map(p.number(), p.string()).max(3);

    fc.assert(
        fc.property(
            fc.array(fc.tuple(fc.float(), fc.string()), { maxLength: 3 }).filter((value) => new Map(value).size <= 3),
            (data) => {
                const dataAsMap = new Map(data);

                const result = schema.safeParse(dataAsMap);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Map<number, string>>;
                    expect(result.value).toBe(dataAsMap);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Invalid max', () => {
    const schema = p.map(p.number(), p.string()).max(3);

    fc.assert(
        fc.property(
            fc.array(fc.tuple(fc.float(), fc.string()), { minLength: 4 }).filter((value) => new Map(value).size >= 4),
            (data) => {
                const dataAsMap = new Map(data);

                const result = schema.safeParse(dataAsMap);
                if (!result.ok) {
                    expect(result.issue).toEqual({ type: 'leaf', code: 'too_long' });
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Valid size', () => {
    const schema = p.map(p.number(), p.string()).size(3);

    fc.assert(
        fc.property(
            fc
                .array(fc.tuple(fc.float(), fc.string()), { minLength: 3, maxLength: 3 })
                .filter((value) => new Map(value).size === 3),
            (data) => {
                const dataAsMap = new Map(data);

                const result = schema.safeParse(dataAsMap);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Map<number, string>>;
                    expect(result.value).toBe(dataAsMap);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Invalid size (too long)', () => {
    const schema = p.map(p.number(), p.string()).size(3);

    fc.assert(
        fc.property(
            fc.array(fc.tuple(fc.float(), fc.string()), { minLength: 4 }).filter((value) => new Map(value).size >= 4),
            (data) => {
                const dataAsMap = new Map(data);

                const result = schema.safeParse(dataAsMap);
                if (!result.ok) {
                    expect(result.issue).toEqual({ type: 'leaf', code: 'too_long' });
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Invalid size (too short)', () => {
    const schema = p.map(p.number(), p.string()).size(3);

    fc.assert(
        fc.property(
            fc.array(fc.tuple(fc.float(), fc.string()), { maxLength: 2 }).filter((value) => new Map(value).size <= 2),
            (data) => {
                const dataAsMap = new Map(data);

                const result = schema.safeParse(dataAsMap);
                if (!result.ok) {
                    expect(result.issue).toEqual({ type: 'leaf', code: 'too_short' });
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Invalid elements', () => {
    const schema = p.map(p.number(), p.string());
    const data = new Map<unknown, unknown>([
        [1, 'valid1'], // Valid.
        ['foo', 'bar'], // Invalid key.
        [2, 'valid2'], // Valid.
        [666, 456], // Invalid value.
        [3, 'valid3'], // Valid.
        ['bar', 789], // Invalid key and value.
        [4, 'valid4'], // Valid.
    ]);

    const result = schema.safeParse(data);
    if (!result.ok) {
        const expectedResult: TreeNode = {
            type: 'join',
            left: {
                type: 'join',
                left: {
                    type: 'nest',
                    key: 1,
                    child: { type: 'nest', key: 0, child: { type: 'leaf', code: 'invalid_type' } },
                },
                right: {
                    type: 'nest',
                    key: 3,
                    child: { type: 'nest', key: 1, child: { type: 'leaf', code: 'invalid_type' } },
                },
            },
            right: {
                type: 'nest',
                key: 5,
                child: {
                    type: 'join',
                    left: {
                        type: 'nest',
                        key: 0,
                        child: { type: 'leaf', code: 'invalid_type' },
                    },
                    right: {
                        type: 'nest',
                        key: 1,
                        child: { type: 'leaf', code: 'invalid_type' },
                    },
                },
            },
        };
        expect(result.issue).toEqual(expectedResult);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Optional', () => {
    const schema = p.map(p.number(), p.string()).optional();

    fc.assert(
        fc.property(fc.option(fc.array(fc.tuple(fc.float(), fc.string())), { nil: undefined }), (data) => {
            const dataAsMap = new Map(data);

            const result = schema.safeParse(dataAsMap);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Map<number, string> | undefined>;
                expect(result.value).toEqual(dataAsMap);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Nullable', () => {
    const schema = p.map(p.number(), p.string()).nullable();

    fc.assert(
        fc.property(fc.option(fc.array(fc.tuple(fc.float(), fc.string())), { nil: null }), (data) => {
            const dataAsMap = new Map(data);

            const result = schema.safeParse(dataAsMap);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Map<number, string> | null>;
                expect(result.value).toEqual(dataAsMap);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Immutable', async (t) => {
    await t.step('min', () => {
        const original = p.map(p.number(), p.string());
        const modified = original.min(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('max', () => {
        const original = p.map(p.number(), p.string());
        const modified = original.max(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('size', () => {
        const original = p.map(p.number(), p.string());
        const modified = original.size(3);
        expect(modified).not.toEqual(original);
    });
});
