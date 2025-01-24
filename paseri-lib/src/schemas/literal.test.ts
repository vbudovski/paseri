import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('String', async (t) => {
    const schema = p.literal('apple');

    await t.step('Valid', () => {
        const result = schema.safeParse('apple');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<'apple'>;
            expect(result.value).toBe('apple');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse('banana');
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: "Invalid value. Expected 'apple'." }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Value', () => {
        expectTypeOf(schema.value).toEqualTypeOf<'apple'>;
    });
});

test('Number', async (t) => {
    const schema = p.literal(123);

    await t.step('Valid', () => {
        const result = schema.safeParse(123);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<123>;
            expect(result.value).toBe(123);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(456);
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: 'Invalid value. Expected 123.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Value', () => {
        expectTypeOf(schema.value).toEqualTypeOf<123>;
    });
});

test('BigInt', async (t) => {
    const schema = p.literal(123n);

    await t.step('Valid', () => {
        const result = schema.safeParse(123n);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<123n>;
            expect(result.value).toBe(123n);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(456n);
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: 'Invalid value. Expected 123n.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Value', () => {
        expectTypeOf(schema.value).toEqualTypeOf<123n>;
    });
});

test('Boolean', async (t) => {
    const schema = p.literal(true);

    await t.step('Valid', () => {
        const result = schema.safeParse(true);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<true>;
            expect(result.value).toBe(true);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(false);
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: 'Invalid value. Expected true.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Value', () => {
        expectTypeOf(schema.value).toEqualTypeOf<true>;
    });
});

test('Symbol', async (t) => {
    const symbolLiteral = Symbol.for('test');
    const schema = p.literal(symbolLiteral);

    await t.step('Valid', () => {
        const data = Symbol.for('test');

        const result = schema.safeParse(data);

        if (result.ok) {
            expect(result.value).toBe(symbolLiteral);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const data = Symbol.for('other');

        const result = schema.safeParse(data);
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: "Invalid value. Expected Symbol('test')." }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Value', () => {
        expectTypeOf(schema.value).toEqualTypeOf<typeof symbolLiteral>;
    });
});

test('Optional', () => {
    const schema = p.literal('apple').optional();

    fc.assert(
        fc.property(fc.option(fc.constant('apple'), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<'apple' | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Nullable', () => {
    const schema = p.literal('apple').nullable();

    fc.assert(
        fc.property(fc.option(fc.constant('apple'), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<'apple' | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
