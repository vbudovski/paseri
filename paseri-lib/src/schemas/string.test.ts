import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import { checkSync } from 'recheck';
import emoji from '../emoji.json' with { type: 'json' };
import * as p from '../index.ts';
import { emailRegex, emojiRegex, nanoidRegex, uuidRegex } from './string.ts';

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
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected string.' }]);
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
                expect(result.messages()).toEqual([{ path: [], message: 'Too short.' }]);
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
                expect(result.messages()).toEqual([{ path: [], message: 'Too long.' }]);
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
                expect(result.messages()).toEqual([{ path: [], message: 'Too long.' }]);
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
                expect(result.messages()).toEqual([{ path: [], message: 'Too short.' }]);
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
            expect(result.messages()).toEqual([{ path: [], message: 'Invalid email.' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });
});

test('Email ReDoS', () => {
    const diagnostics = checkSync(emailRegex.source, emailRegex.flags, { timeout: 20_000 });
    if (diagnostics.status === 'vulnerable') {
        console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
    } else if (diagnostics.status === 'unknown') {
        console.log(`Error: ${diagnostics.error.kind}.`);
    }
    expect(diagnostics.status).toBe('safe');
});

test('Valid emoji', () => {
    const schema = p.string().emoji();

    fc.assert(
        fc.property(
            fc.string({
                minLength: 1,
                unit: fc.mapToConstant(
                    ...emoji.map((e) => ({ num: e.count, build: (v: number) => String.fromCodePoint(v + e.start) })),
                ),
            }),
            (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<string>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            },
        ),
    );
});

test('Invalid emoji', () => {
    const schema = p.string().emoji();

    fc.assert(
        fc.property(
            fc.string().filter((value) => !emojiRegex.test(value)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid emoji.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Emoji ReDoS', () => {
    const diagnostics = checkSync(emojiRegex.source, emojiRegex.flags);
    if (diagnostics.status === 'vulnerable') {
        console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
    } else if (diagnostics.status === 'unknown') {
        console.log(`Error: ${diagnostics.error.kind}.`);
    }
    expect(diagnostics.status).toBe('safe');
});

test('Valid UUID', () => {
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

test('Invalid UUID', () => {
    const schema = p.string().uuid();

    fc.assert(
        fc.property(
            fc.string().filter((value) => !uuidRegex.test(value)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid UUID.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('UUID ReDoS', () => {
    const diagnostics = checkSync(uuidRegex.source, uuidRegex.flags);
    if (diagnostics.status === 'vulnerable') {
        console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
    } else if (diagnostics.status === 'unknown') {
        console.log(`Error: ${diagnostics.error.kind}.`);
    }
    expect(diagnostics.status).toBe('safe');
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
        fc.property(
            fc.string().filter((value) => !nanoidRegex.test(value)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid Nano ID.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Nano ID ReDoS', () => {
    const diagnostics = checkSync(nanoidRegex.source, nanoidRegex.flags);
    if (diagnostics.status === 'vulnerable') {
        console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
    } else if (diagnostics.status === 'unknown') {
        console.log(`Error: ${diagnostics.error.kind}.`);
    }
    expect(diagnostics.status).toBe('safe');
});

test('Valid includes', () => {
    const schema = p.string().includes('foo');

    fc.assert(
        fc.property(fc.string(), fc.string(), (prefix, suffix) => {
            const data = `${prefix}foo${suffix}`;
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

test('Invalid includes', () => {
    const schema = p.string().includes('foo');

    fc.assert(
        fc.property(
            fc.string().filter((value) => !value.includes('foo')),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Does not include search string.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Valid startsWith', () => {
    const schema = p.string().startsWith('foo');

    fc.assert(
        fc.property(fc.string(), (suffix) => {
            const data = `foo${suffix}`;
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

test('Invalid startsWith', () => {
    const schema = p.string().startsWith('foo');

    fc.assert(
        fc.property(
            fc.string().filter((value) => !value.startsWith('foo')),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Does not start with search string.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
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

    await t.step('includes', () => {
        const original = p.string();
        const modified = original.includes('foo');
        expect(modified).not.toEqual(original);
    });

    await t.step('startsWith', () => {
        const original = p.string();
        const modified = original.startsWith('foo');
        expect(modified).not.toEqual(original);
    });
});
