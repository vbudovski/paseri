import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.array(p.number());

    fc.assert(
        fc.property(fc.array(fc.float({ noNaN: true })), (data) => {
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
    const schema = p.array(p.number());

    fc.assert(
        fc.property(
            fc.anything().filter((value) => !Array.isArray(value)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected array.' }]);
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
        fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 3 }), (data) => {
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
        fc.property(fc.array(fc.float({ noNaN: true }), { maxLength: 2 }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'Too short.' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid max', () => {
    const schema = p.array(p.number()).max(3);

    fc.assert(
        fc.property(fc.array(fc.float({ noNaN: true }), { maxLength: 3 }), (data) => {
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
        fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 4 }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'Too long.' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid length', () => {
    const schema = p.array(p.number()).length(3);

    fc.assert(
        fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 3, maxLength: 3 }), (data) => {
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
        fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 4 }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'Too long.' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Invalid length (too short)', () => {
    const schema = p.array(p.number()).length(3);

    fc.assert(
        fc.property(fc.array(fc.float({ noNaN: true }), { maxLength: 2 }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'Too short.' }]);
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
        expect(result.messages()).toEqual([
            { path: [1], message: 'Invalid type. Expected number.' },
            { path: [3], message: 'Invalid type. Expected number.' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Invalid nested elements', () => {
    const schema = p.array(p.array(p.number()));
    const data = [[1], [2, 'foo'], [3], 'bar'];
    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([
            { path: [1, 1], message: 'Invalid type. Expected number.' },
            { path: [3], message: 'Invalid type. Expected array.' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Optional', () => {
    const schema = p.array(p.number()).optional();

    fc.assert(
        fc.property(fc.option(fc.array(fc.float({ noNaN: true })), { nil: undefined }), (data) => {
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
        fc.property(fc.option(fc.array(fc.float({ noNaN: true })), { nil: null }), (data) => {
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
