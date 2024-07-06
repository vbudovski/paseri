import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import * as p from '../index.ts';

const { test } = Deno;

test('Type', async (t) => {
    const schema = p.string();

    await t.step('Valid', () => {
        const result = schema.safeParse('Hello, world!');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<string>;
            expect(result.value).toBe('Hello, world!');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Not a string', () => {
        const result = schema.safeParse(null);
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_type' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Min', async (t) => {
    const schema = p.string().min(3);

    await t.step('Valid', () => {
        const result = schema.safeParse('aaa');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<string>;
            expect(result.value).toBe('aaa');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too short', () => {
        const result = schema.safeParse('aa');
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_short' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Max', async (t) => {
    const schema = p.string().max(3);

    await t.step('Valid', () => {
        const result = schema.safeParse('aaa');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<string>;
            expect(result.value).toBe('aaa');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too long', () => {
        const result = schema.safeParse('aaaa');
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_long' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Length', async (t) => {
    const schema = p.string().length(3);

    await t.step('Valid', () => {
        const result = schema.safeParse('aaa');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<string>;
            expect(result.value).toBe('aaa');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Too long', () => {
        const result = schema.safeParse('aaaa');
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_long' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    await t.step('Too short', () => {
        const result = schema.safeParse('aa');
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'too_short' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Email', async (t) => {
    const schema = p.string().email();

    await t.step('Valid', () => {
        const result = schema.safeParse('hello@example.com');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<string>;
            expect(result.value).toBe('hello@example.com');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse('not_an_email');
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_email' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Emoji', async (t) => {
    const schema = p.string().emoji();

    await t.step('Valid', () => {
        const result = schema.safeParse('🥳');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<string>;
            expect(result.value).toBe('🥳');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse('a');
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_emoji' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('UUID', async (t) => {
    const schema = p.string().uuid();

    await t.step('Valid', () => {
        const result = schema.safeParse('d98d4b7e-58a5-4e21-839b-2699b94c115b');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<string>;
            expect(result.value).toBe('d98d4b7e-58a5-4e21-839b-2699b94c115b');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse('not_a_uuid');
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_uuid' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Nano ID', async (t) => {
    const schema = p.string().nanoid();

    await t.step('Valid', () => {
        const result = schema.safeParse('V1StGXR8_Z5jdHi6B-myT');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<string>;
            expect(result.value).toBe('V1StGXR8_Z5jdHi6B-myT');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    await t.step('Invalid', () => {
        const result = schema.safeParse('not_a_nano_id');
        if (!result.ok) {
            expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_nanoid' });
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Optional', () => {
    const schema = p.string().optional();
    const result = schema.safeParse(undefined);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<string | undefined>;
        expect(result.value).toBe(undefined);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Nullable', () => {
    const schema = p.string().nullable();
    const result = schema.safeParse(null);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<string | null>;
        expect(result.value).toBe(null);
    } else {
        expect(result.ok).toBeTruthy();
    }
});
