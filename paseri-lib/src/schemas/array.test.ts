import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';
import type { TreeNode } from '../issue.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.array(p.number());

    fc.assert(
        fc.property(fc.array(fc.float()), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number[]>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid type', () => {
    const schema = p.string();

    fc.assert(
        fc.property(
            fc.anything().filter((value) => Array.isArray(value)),
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

test('Valid min', () => {
    const schema = p.array(p.number()).min(3);

    fc.assert(
        fc.property(fc.array(fc.float(), { minLength: 3 }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number[]>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid min', () => {
    const schema = p.array(p.number()).min(3);

    fc.assert(
        fc.property(fc.array(fc.float(), { maxLength: 2 }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'too_short' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid max', () => {
    const schema = p.array(p.number()).max(3);

    fc.assert(
        fc.property(fc.array(fc.float(), { maxLength: 3 }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number[]>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid max', () => {
    const schema = p.array(p.number()).max(3);

    fc.assert(
        fc.property(fc.array(fc.float(), { minLength: 4 }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'too_long' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid length', () => {
    const schema = p.array(p.number()).length(3);

    fc.assert(
        fc.property(fc.array(fc.float(), { minLength: 3, maxLength: 3 }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number[]>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid length (too long)', () => {
    const schema = p.array(p.number()).length(3);

    fc.assert(
        fc.property(fc.array(fc.float(), { minLength: 4 }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'too_long' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Invalid length (too short)', () => {
    const schema = p.array(p.number()).length(3);

    fc.assert(
        fc.property(fc.array(fc.float(), { maxLength: 2 }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'too_short' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Invalid elements', () => {
    const schema = p.array(p.number());
    const data = [1, 'foo', 2, 'bar'];

    const result = schema.safeParse(data);
    if (!result.ok) {
        const expectedResult: TreeNode = {
            type: 'join',
            left: { type: 'nest', key: 1, child: { type: 'leaf', code: 'invalid_type' } },
            right: { type: 'nest', key: 3, child: { type: 'leaf', code: 'invalid_type' } },
        };
        expect(result.issue).toEqual(expectedResult);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Optional', () => {
    const schema = p.array(p.number()).optional();

    fc.assert(
        fc.property(fc.option(fc.array(fc.float()), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number[] | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Nullable', () => {
    const schema = p.array(p.number()).nullable();

    fc.assert(
        fc.property(fc.option(fc.array(fc.float()), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number[] | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Immutable', async (t) => {
    await t.step('min', () => {
        const original = p.array(p.string());
        const modified = original.min(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('max', () => {
        const original = p.array(p.string());
        const modified = original.max(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('length', () => {
        const original = p.array(p.string());
        const modified = original.length(3);
        expect(modified).not.toEqual(original);
    });
});
