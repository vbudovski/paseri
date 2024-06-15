import { expect } from '@std/expect';
import * as s from '../src/index.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = s.number();

    await t.step('Valid', () => {
        const result = schema.safeParse(123);
        if (result.ok) {
            expect(result.value).toBe(123);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Not a number', () => {
        const result = schema.safeParse(null);
        if (!result.ok) {
            expect(result.errors).toEqual([{ path: [], message: 'Not a number.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Greater than or equal', async (t) => {
    const schema = s.number().gte(10);

    await t.step('Valid', () => {
        const result = schema.safeParse(10);
        if (result.ok) {
            expect(result.value).toBe(10);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too small', () => {
        const result = schema.safeParse(9);
        if (!result.ok) {
            expect(result.errors).toEqual([{ path: [], message: 'Too small.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Greater than', async (t) => {
    const schema = s.number().gt(10);

    await t.step('Valid', () => {
        const result = schema.safeParse(11);
        if (result.ok) {
            expect(result.value).toBe(11);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too small', () => {
        const result = schema.safeParse(10);
        if (!result.ok) {
            expect(result.errors).toEqual([{ path: [], message: 'Too small.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Less than or equal', async (t) => {
    const schema = s.number().lte(10);

    await t.step('Valid', () => {
        const result = schema.safeParse(10);
        if (result.ok) {
            expect(result.value).toBe(10);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too large', () => {
        const result = schema.safeParse(11);
        if (!result.ok) {
            expect(result.errors).toEqual([{ path: [], message: 'Too large.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Less than', async (t) => {
    const schema = s.number().lt(10);

    await t.step('Valid', () => {
        const result = schema.safeParse(9);
        if (result.ok) {
            expect(result.value).toBe(9);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too large', () => {
        const result = schema.safeParse(10);
        if (!result.ok) {
            expect(result.errors).toEqual([{ path: [], message: 'Too large.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Integer', async (t) => {
    const schema = s.number().int();

    await t.step('Valid', () => {
        const result = schema.safeParse(123);
        if (result.ok) {
            expect(result.value).toBe(123);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(123.4);
        if (!result.ok) {
            expect(result.errors).toEqual([{ path: [], message: 'Not an integer.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Finite', async (t) => {
    const schema = s.number().finite();

    await t.step('Valid', () => {
        const result = schema.safeParse(123);
        if (result.ok) {
            expect(result.value).toBe(123);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(Number.NEGATIVE_INFINITY);
        if (!result.ok) {
            expect(result.errors).toEqual([{ path: [], message: 'Not finite.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Safe integer', async (t) => {
    const schema = s.number().safe();

    await t.step('Valid', () => {
        const result = schema.safeParse(123);
        if (result.ok) {
            expect(result.value).toBe(123);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse(Number.MAX_SAFE_INTEGER + 1);
        if (!result.ok) {
            expect(result.errors).toEqual([{ path: [], message: 'Not safe integer.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});
