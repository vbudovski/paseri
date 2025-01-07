import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.map(p.number(), p.string());

    fc.assert(
        fc.property(fc.array(fc.tuple(fc.float({ noNaN: true }), fc.string())), (data) => {
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
                expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected Map.' }]);
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
            fc
                .array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { minLength: 3 })
                .filter((value) => new Map(value).size >= 3),
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
            fc
                .array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { maxLength: 2 })
                .filter((value) => new Map(value).size <= 2),
            (data) => {
                const dataAsMap = new Map(data);

                const result = schema.safeParse(dataAsMap);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Too short.' }]);
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
            fc
                .array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { maxLength: 3 })
                .filter((value) => new Map(value).size <= 3),
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
            fc
                .array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { minLength: 4 })
                .filter((value) => new Map(value).size >= 4),
            (data) => {
                const dataAsMap = new Map(data);

                const result = schema.safeParse(dataAsMap);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Too long.' }]);
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
                .array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { minLength: 3, maxLength: 3 })
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
            fc
                .array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { minLength: 4 })
                .filter((value) => new Map(value).size >= 4),
            (data) => {
                const dataAsMap = new Map(data);

                const result = schema.safeParse(dataAsMap);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Too long.' }]);
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
            fc
                .array(fc.tuple(fc.float({ noNaN: true }), fc.string()), { maxLength: 2 })
                .filter((value) => new Map(value).size <= 2),
            (data) => {
                const dataAsMap = new Map(data);

                const result = schema.safeParse(dataAsMap);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Too short.' }]);
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
        expect(result.messages()).toEqual([
            { path: [1, 0], message: 'Invalid type. Expected number.' },
            { path: [3, 1], message: 'Invalid type. Expected string.' },
            { path: [5, 0], message: 'Invalid type. Expected number.' },
            { path: [5, 1], message: 'Invalid type. Expected string.' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Optional', () => {
    const schema = p.map(p.number(), p.string()).optional();

    fc.assert(
        fc.property(
            fc.option(fc.array(fc.tuple(fc.float({ noNaN: true }), fc.string())), { nil: undefined }),
            (data) => {
                const dataAsMap = new Map(data);

                const result = schema.safeParse(dataAsMap);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Map<number, string> | undefined>;
                    expect(result.value).toEqual(dataAsMap);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Nullable', () => {
    const schema = p.map(p.number(), p.string()).nullable();

    fc.assert(
        fc.property(fc.option(fc.array(fc.tuple(fc.float({ noNaN: true }), fc.string())), { nil: null }), (data) => {
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
