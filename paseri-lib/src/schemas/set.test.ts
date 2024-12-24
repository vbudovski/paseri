import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.set(p.number());

    fc.assert(
        fc.property(fc.array(fc.float()), (data) => {
            const dataAsSet = new Set(data);

            const result = schema.safeParse(dataAsSet);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Set<number>>;
                expect(result.value).toEqual(dataAsSet);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid type', () => {
    const schema = p.set(p.number());

    fc.assert(
        fc.property(fc.anything(), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected Set.' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid min', () => {
    const schema = p.set(p.number()).min(3);

    fc.assert(
        fc.property(
            fc.array(fc.float(), { minLength: 3 }).filter((value) => new Set(value).size >= 3),
            (data) => {
                const dataAsSet = new Set(data);

                const result = schema.safeParse(dataAsSet);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Set<number>>;
                    expect(result.value).toBe(dataAsSet);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Invalid min', () => {
    const schema = p.set(p.number()).min(3);

    fc.assert(
        fc.property(
            fc.array(fc.float(), { maxLength: 2 }).filter((value) => new Set(value).size <= 2),
            (data) => {
                const dataAsSet = new Set(data);

                const result = schema.safeParse(dataAsSet);
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
    const schema = p.set(p.number()).max(3);

    fc.assert(
        fc.property(
            fc.array(fc.float(), { maxLength: 3 }).filter((value) => new Set(value).size <= 3),
            (data) => {
                const dataAsSet = new Set(data);

                const result = schema.safeParse(dataAsSet);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Set<number>>;
                    expect(result.value).toBe(dataAsSet);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Invalid max', () => {
    const schema = p.set(p.number()).max(3);

    fc.assert(
        fc.property(
            fc.array(fc.float(), { minLength: 4 }).filter((value) => new Set(value).size >= 4),
            (data) => {
                const dataAsSet = new Set(data);

                const result = schema.safeParse(dataAsSet);
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
    const schema = p.set(p.number()).size(3);

    fc.assert(
        fc.property(
            fc.array(fc.float(), { minLength: 3, maxLength: 3 }).filter((value) => new Set(value).size === 3),
            (data) => {
                const dataAsSet = new Set(data);

                const result = schema.safeParse(dataAsSet);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<Set<number>>;
                    expect(result.value).toBe(dataAsSet);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Invalid size (too long)', () => {
    const schema = p.set(p.number()).size(3);

    fc.assert(
        fc.property(
            fc.array(fc.float(), { minLength: 4 }).filter((value) => new Set(value).size >= 4),
            (data) => {
                const dataAsSet = new Set(data);

                const result = schema.safeParse(dataAsSet);
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
    const schema = p.set(p.number()).size(3);

    fc.assert(
        fc.property(
            fc.array(fc.float(), { maxLength: 2 }).filter((value) => new Set(value).size <= 2),
            (data) => {
                const dataAsSet = new Set(data);

                const result = schema.safeParse(dataAsSet);
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
    const schema = p.set(p.number());
    const data = new Set([1, 'foo', 2, 'bar']);

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

test('Optional', () => {
    const schema = p.set(p.number()).optional();

    fc.assert(
        fc.property(fc.option(fc.array(fc.float()), { nil: undefined }), (data) => {
            const dataAsSet = new Set(data);

            const result = schema.safeParse(dataAsSet);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Set<number> | undefined>;
                expect(result.value).toEqual(dataAsSet);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Nullable', () => {
    const schema = p.set(p.number()).nullable();

    fc.assert(
        fc.property(fc.option(fc.array(fc.float()), { nil: null }), (data) => {
            const dataAsSet = new Set(data);

            const result = schema.safeParse(dataAsSet);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Set<number> | null>;
                expect(result.value).toEqual(dataAsSet);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Immutable', async (t) => {
    await t.step('min', () => {
        const original = p.set(p.string());
        const modified = original.min(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('max', () => {
        const original = p.set(p.string());
        const modified = original.max(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('size', () => {
        const original = p.set(p.string());
        const modified = original.size(3);
        expect(modified).not.toEqual(original);
    });
});
