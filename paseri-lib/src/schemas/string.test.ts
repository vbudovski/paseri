import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';
import { nanoidRegex } from './string.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.string();

    fc.assert(
        fc.property(fc.string(), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string>;
                expect(result.value).toBe(data);
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
            fc.anything().filter((value) => typeof value !== 'string'),
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
    const schema = p.string().min(3);

    fc.assert(
        fc.property(fc.string({ minLength: 3 }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid min', () => {
    const schema = p.string().min(3);

    fc.assert(
        fc.property(fc.string({ maxLength: 2 }), (data) => {
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
    const schema = p.string().max(3);

    fc.assert(
        fc.property(fc.string({ maxLength: 3 }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid max', () => {
    const schema = p.string().max(3);

    fc.assert(
        fc.property(fc.string({ minLength: 4 }), (data) => {
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
    const schema = p.string().length(3);

    fc.assert(
        fc.property(fc.string({ minLength: 3, maxLength: 3 }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid length (too long)', () => {
    const schema = p.string().length(3);

    fc.assert(
        fc.property(fc.string({ minLength: 4 }), (data) => {
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
    const schema = p.string().length(3);

    fc.assert(
        fc.property(fc.string({ maxLength: 2 }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'too_short' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Email', async (t) => {
    // TODO: Use fast-check once it has better support for the email regex.
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
    // TODO: Use fast-check once it has better support for the emoji regex.
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

test('Valid uuid', () => {
    const schema = p.string().uuid();

    fc.assert(
        fc.property(fc.uuid(), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid uuid', () => {
    const schema = p.string().uuid();

    fc.assert(
        // It's possible that this will generate a valid UUID, but *extremely* unlikely.
        fc.property(fc.string(), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_uuid' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid Nano ID', () => {
    const schema = p.string().nanoid();
    // FIXME: fast-check doesn't like case-insensitive regexes.
    const regex = new RegExp(nanoidRegex.source);

    fc.assert(
        fc.property(fc.stringMatching(regex), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid Nano ID', () => {
    const schema = p.string().nanoid();

    fc.assert(
        // It's possible that this will generate a valid Nano, but *extremely* unlikely.
        fc.property(fc.string(), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_nanoid' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Optional', () => {
    const schema = p.string().optional();

    fc.assert(
        fc.property(fc.option(fc.string(), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Nullable', () => {
    const schema = p.string().nullable();

    fc.assert(
        fc.property(fc.option(fc.string(), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Immutable', async (t) => {
    await t.step('min', () => {
        const original = p.string();
        const modified = original.min(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('max', () => {
        const original = p.string();
        const modified = original.max(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('length', () => {
        const original = p.string();
        const modified = original.length(3);
        expect(modified).not.toEqual(original);
    });

    await t.step('email', () => {
        const original = p.string();
        const modified = original.email();
        expect(modified).not.toEqual(original);
    });

    await t.step('emoji', () => {
        const original = p.string();
        const modified = original.emoji();
        expect(modified).not.toEqual(original);
    });

    await t.step('uuid', () => {
        const original = p.string();
        const modified = original.uuid();
        expect(modified).not.toEqual(original);
    });

    await t.step('nanoid', () => {
        const original = p.string();
        const modified = original.nanoid();
        expect(modified).not.toEqual(original);
    });
});
