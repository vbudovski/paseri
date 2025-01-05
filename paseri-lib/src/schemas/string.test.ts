import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import { checkSync } from 'recheck';
import emoji from '../emoji.json' with { type: 'json' };
import * as p from '../index.ts';
import {
    dateRegex,
    datetimeRegex,
    emailRegex,
    emojiRegex,
    ipCidrRegex,
    ipRegex,
    nanoidRegex,
    timeRegex,
    uuidRegex,
} from './string.ts';

const { test } = Deno;

function formatDate(value: Date): string {
    const year =
        value.getFullYear() >= 0
            ? String(value.getFullYear()).padStart(4, '0')
            : `-${String(Math.abs(value.getFullYear())).padStart(4, '0')}`;
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const date = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${date}`;
}

function formatTime(value: Date, precision?: number): string {
    const hour = String(value.getHours()).padStart(2, '0');
    const minute = String(value.getMinutes()).padStart(2, '0');
    const second = String(value.getSeconds()).padStart(2, '0');
    const fraction = value.getMilliseconds() / 1000;
    const fractionString =
        precision === undefined
            ? String(fraction).slice(1)
            : `.${fraction.toFixed(precision).slice(2).padEnd(precision, '0')}`;

    return `${hour}:${minute}:${second}${fractionString}`;
}

function formatDatetime(value: Date, timezone: number, precision?: number, offset?: boolean, local?: boolean): string {
    const timezoneString =
        timezone === 0
            ? 'Z'
            : `${Math.sign(timezone) >= 0 ? '+' : '-'}${String(Math.floor(Math.abs(timezone) / 60)).padStart(2, '0')}:${String(Math.abs(timezone) % 60).padStart(2, '0')}`;

    return `${formatDate(value)}T${formatTime(value, precision)}${local ? '' : offset ? timezoneString : 'Z'}`;
}

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

test('Valid email', () => {
    const schema = p.string().email();

    fc.assert(
        fc.property(fc.emailAddress(), (data) => {
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

test('Invalid email', () => {
    const schema = p.string().email();
    const regex = emailRegex();

    fc.assert(
        fc.property(
            fc.string().filter((value) => !regex.test(value)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid email.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Email ReDoS', () => {
    const regex = emailRegex();
    const diagnostics = checkSync(regex.source, regex.flags.replace('v', 'u'));
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
    const regex = emojiRegex();

    fc.assert(
        fc.property(
            fc.string().filter((value) => !regex.test(value)),
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
    const regex = emojiRegex();
    const diagnostics = checkSync(regex.source, regex.flags.replace('v', 'u'));
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
    const regex = uuidRegex();

    fc.assert(
        fc.property(
            fc.string().filter((value) => !regex.test(value)),
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
    const regex = uuidRegex();
    const diagnostics = checkSync(regex.source, regex.flags.replace('v', 'u'));
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
    const regex = new RegExp(nanoidRegex().source);

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
    const regex = nanoidRegex();

    fc.assert(
        fc.property(
            fc.string().filter((value) => !regex.test(value)),
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
    const regex = nanoidRegex();
    const diagnostics = checkSync(regex.source, regex.flags);
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

test('Valid endsWith', () => {
    const schema = p.string().endsWith('foo');

    fc.assert(
        fc.property(fc.string(), (prefix) => {
            const data = `${prefix}foo`;
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

test('Invalid endsWith', () => {
    const schema = p.string().endsWith('foo');

    fc.assert(
        fc.property(
            fc.string().filter((value) => !value.endsWith('foo')),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Does not end with search string.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Valid date', () => {
    const schema = p.string().date();

    fc.assert(
        fc.property(
            fc.date({ min: new Date(0, 0, 1), max: new Date(9999, 11, 31) }).map((value) => {
                return formatDate(value);
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

test('Invalid date', () => {
    const schema = p.string().date();
    const regex = dateRegex();

    fc.assert(
        fc.property(
            fc.string().filter((value) => !regex.test(value)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid date string.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Date ReDoS', () => {
    const regex = dateRegex();
    const diagnostics = checkSync(regex.source, regex.flags.replace('v', 'u'));
    if (diagnostics.status === 'vulnerable') {
        console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
    } else if (diagnostics.status === 'unknown') {
        console.log(`Error: ${diagnostics.error.kind}.`);
    }
    expect(diagnostics.status).toBe('safe');
});

test('Valid time', () => {
    fc.assert(
        fc.property(
            fc.date({ min: new Date(0, 0, 1), max: new Date(9999, 11, 31) }),
            fc.option(fc.integer({ min: 0, max: 8 }), { nil: undefined }),
            (date, precision) => {
                const data = formatTime(date, precision);

                const schema = p.string().time({ precision });
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

test('Invalid time', () => {
    const schema = p.string().time();

    fc.assert(
        fc.property(
            fc.string().filter((value) => !timeRegex().test(value)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid time string.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Time ReDoS', () => {
    fc.assert(
        fc.property(fc.option(fc.integer({ min: 0, max: 8 }), { nil: undefined }), (precision) => {
            const regex = timeRegex(precision);
            const diagnostics = checkSync(regex.source, regex.flags.replace('v', 'u'));
            if (diagnostics.status === 'vulnerable') {
                console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
            } else if (diagnostics.status === 'unknown') {
                console.log(`Error: ${diagnostics.error.kind}.`);
            }
            expect(diagnostics.status).toBe('safe');
        }),
        { ignoreEqualValues: true },
    );
});

test('Valid datetime', () => {
    fc.assert(
        fc.property(
            fc.date({ min: new Date(0, 0, 1), max: new Date(9999, 11, 31) }),
            fc.integer({ min: -1000, max: 1000 }),
            fc.option(fc.integer({ min: 0, max: 8 }), { nil: undefined }),
            fc.boolean(),
            fc.boolean(),
            (date, timezone, precision, offset, local) => {
                const data = formatDatetime(date, timezone, precision, offset, local);

                const schema = p.string().datetime({ precision, offset, local });
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

test('Invalid datetime', () => {
    const schema = p.string().datetime();

    fc.assert(
        fc.property(
            fc.string().filter((value) => !datetimeRegex().test(value)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid datetime string.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Datetime ReDoS', () => {
    fc.assert(
        fc.property(
            fc.option(fc.integer({ min: 0, max: 8 }), { nil: undefined }),
            fc.boolean(),
            fc.boolean(),
            (precision, offset, local) => {
                const regex = datetimeRegex(precision, offset, local);
                const diagnostics = checkSync(regex.source, regex.flags.replace('v', 'u'));
                if (diagnostics.status === 'vulnerable') {
                    console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
                } else if (diagnostics.status === 'unknown') {
                    console.log(`Error: ${diagnostics.error.kind}.`);
                }
                expect(diagnostics.status).toBe('safe');
            },
        ),
        { ignoreEqualValues: true },
    );
});

test('Valid ip', () => {
    const schema = p.string().ip();

    fc.assert(
        fc.property(fc.oneof(fc.ipV4(), fc.ipV6()), (data) => {
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

test('Invalid ip', () => {
    const schema = p.string().ip();

    fc.assert(
        fc.property(
            fc.string().filter((value) => !ipRegex().test(value)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid IP address.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('ip ReDoS', () => {
    fc.assert(
        fc.property(fc.constantFrom(4 as const, 6 as const, undefined), (version) => {
            const regex = ipRegex(version);
            const diagnostics = checkSync(regex.source, regex.flags.replace('v', 'u'), { timeout: 20_000 });
            if (diagnostics.status === 'vulnerable') {
                console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
            } else if (diagnostics.status === 'unknown') {
                console.log(`Error: ${diagnostics.error.kind}.`);
            }
            expect(diagnostics.status).toBe('safe');
        }),
        { ignoreEqualValues: true },
    );
});

test('Valid cidr', () => {
    const schema = p.string().cidr();

    fc.assert(
        fc.property(
            fc.oneof(
                fc.tuple(fc.ipV4(), fc.integer({ min: 1, max: 32 })).map(([ip, bits]) => `${ip}/${bits}`),
                fc.tuple(fc.ipV6(), fc.integer({ min: 1, max: 128 })).map(([ip, bits]) => `${ip}/${bits}`),
            ),
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

test('Invalid cidr', () => {
    const schema = p.string().cidr();

    fc.assert(
        fc.property(
            fc.string().filter((value) => !ipCidrRegex().test(value)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid IP address range.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('cidr ReDoS', () => {
    fc.assert(
        fc.property(fc.constantFrom(4 as const, 6 as const, undefined), (version) => {
            const regex = ipCidrRegex(version);
            const diagnostics = checkSync(regex.source, regex.flags.replace('v', 'u'), { timeout: 20_000 });
            if (diagnostics.status === 'vulnerable') {
                console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
            } else if (diagnostics.status === 'unknown') {
                console.log(`Error: ${diagnostics.error.kind}.`);
            }
            expect(diagnostics.status).toBe('safe');
        }),
        { ignoreEqualValues: true },
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

    await t.step('endsWith', () => {
        const original = p.string();
        const modified = original.endsWith('foo');
        expect(modified).not.toEqual(original);
    });

    await t.step('date', () => {
        const original = p.string();
        const modified = original.date();
        expect(modified).not.toEqual(original);
    });

    await t.step('time', () => {
        const original = p.string();
        const modified = original.time();
        expect(modified).not.toEqual(original);
    });

    await t.step('datetime', () => {
        const original = p.string();
        const modified = original.datetime();
        expect(modified).not.toEqual(original);
    });

    await t.step('ip', () => {
        const original = p.string();
        const modified = original.ip();
        expect(modified).not.toEqual(original);
    });

    await t.step('cidr', () => {
        const original = p.string();
        const modified = original.cidr();
        expect(modified).not.toEqual(original);
    });
});
