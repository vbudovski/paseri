import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import { check } from 'recheck';
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
} from '../checks/string.ts';
import emoji from '../emoji.json' with { type: 'json' };
import * as p from '../index.ts';

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
            : precision === 0
              ? ''
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

it('accepts valid types', () => {
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

it('rejects invalid types', () => {
    const schema = p.string();

    fc.assert(
        fc.property(
            fc.anything().filter((value) => typeof value !== 'string'),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_type' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

describe('min', () => {
    it('accepts valid values', () => {
        const schema = p.string(p.minLength(3));

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

    it('rejects invalid values', () => {
        const schema = p.string(p.minLength(3));

        fc.assert(
            fc.property(fc.string({ maxLength: 2 }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('throws on NaN', () => {
        expect(() => p.minLength(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.minLength(3));
        expect(modified).not.toEqual(original);
        const branched = p.string(p.minLength(3), p.maxLength(5));
        expect(branched).not.toEqual(modified);
    });
});

describe('max', () => {
    it('accepts valid values', () => {
        const schema = p.string(p.maxLength(3));

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

    it('rejects invalid values', () => {
        const schema = p.string(p.maxLength(3));

        fc.assert(
            fc.property(fc.string({ minLength: 4 }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_long' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('throws on NaN', () => {
        expect(() => p.maxLength(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.maxLength(3));
        expect(modified).not.toEqual(original);
        const branched = p.string(p.maxLength(3), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('length', () => {
    it('accepts valid values', () => {
        const schema = p.string(p.minLength(3), p.maxLength(3));

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

    it('rejects values that are too long', () => {
        const schema = p.string(p.minLength(3), p.maxLength(3));

        fc.assert(
            fc.property(fc.string({ minLength: 4 }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_long' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('rejects values that are too short', () => {
        const schema = p.string(p.minLength(3), p.maxLength(3));

        fc.assert(
            fc.property(fc.string({ maxLength: 2 }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('throws on NaN', () => {
        expect(() => p.minLength(NaN)).toThrow();
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.minLength(3), p.maxLength(3));
        expect(modified).not.toEqual(original);
        const branched = p.string(p.minLength(3), p.maxLength(3), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('email', () => {
    it('accepts valid values', () => {
        const schema = p.string(p.email());

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

    it('rejects invalid values', () => {
        const schema = p.string(p.email());
        const regex = emailRegex();

        fc.assert(
            fc.property(
                fc.string().filter((value) => !regex.test(value)),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'invalid_email' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('is safe from ReDoS', async () => {
        const regex = emailRegex();
        // TODO: recheck doesn't support the v flag yet (https://github.com/makenowjust-labs/recheck/issues/1359).
        //  Remove this workaround when it does.
        // Strip v-mode-specific escapes that are invalid in u-mode.
        const source = regex.source.replace(/\\([&!#%,:;<=>@`~])/g, '$1');
        const diagnostics = await check(source, regex.flags.replace('v', 'u'));
        if (diagnostics.status === 'vulnerable') {
            console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
        } else if (diagnostics.status === 'unknown') {
            console.log(`Error: ${diagnostics.error.kind}.`);
        }
        expect(diagnostics.status).toBe('safe');
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.email());
        expect(modified).not.toEqual(original);
        const branched = p.string(p.email(), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('emoji', () => {
    it('accepts valid values', () => {
        const schema = p.string(p.emoji());

        fc.assert(
            fc.property(
                fc.string({
                    minLength: 1,
                    unit: fc.mapToConstant(
                        ...emoji.map((e) => ({
                            num: e.count,
                            build: (v: number) => String.fromCodePoint(v + e.start),
                        })),
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

    it('rejects invalid values', () => {
        const schema = p.string(p.emoji());
        const regex = emojiRegex();

        fc.assert(
            fc.property(
                fc.string().filter((value) => !regex.test(value)),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'invalid_emoji' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('is safe from ReDoS', async () => {
        const regex = emojiRegex();
        const diagnostics = await check(regex.source, regex.flags.replace('v', 'u'));
        if (diagnostics.status === 'vulnerable') {
            console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
        } else if (diagnostics.status === 'unknown') {
            console.log(`Error: ${diagnostics.error.kind}.`);
        }
        expect(diagnostics.status).toBe('safe');
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.emoji());
        expect(modified).not.toEqual(original);
        const branched = p.string(p.emoji(), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('uuid', () => {
    it('accepts valid values', () => {
        const schema = p.string(p.uuid());

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

    it('rejects invalid values', () => {
        const schema = p.string(p.uuid());
        const regex = uuidRegex();

        fc.assert(
            fc.property(
                fc.string().filter((value) => !regex.test(value)),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'invalid_uuid' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('is safe from ReDoS', async () => {
        const regex = uuidRegex();
        const diagnostics = await check(regex.source, regex.flags.replace('v', 'u'));
        if (diagnostics.status === 'vulnerable') {
            console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
        } else if (diagnostics.status === 'unknown') {
            console.log(`Error: ${diagnostics.error.kind}.`);
        }
        expect(diagnostics.status).toBe('safe');
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.uuid());
        expect(modified).not.toEqual(original);
        const branched = p.string(p.uuid(), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('nanoid', () => {
    it('accepts valid values', () => {
        const schema = p.string(p.nanoid());
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

    it('rejects invalid values', () => {
        const schema = p.string(p.nanoid());
        const regex = nanoidRegex();

        fc.assert(
            fc.property(
                fc.string().filter((value) => !regex.test(value)),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'invalid_nanoid' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('is safe from ReDoS', async () => {
        const regex = nanoidRegex();
        const diagnostics = await check(regex.source, regex.flags);
        if (diagnostics.status === 'vulnerable') {
            console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
        } else if (diagnostics.status === 'unknown') {
            console.log(`Error: ${diagnostics.error.kind}.`);
        }
        expect(diagnostics.status).toBe('safe');
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.nanoid());
        expect(modified).not.toEqual(original);
        const branched = p.string(p.nanoid(), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('includes', () => {
    it('accepts valid values', () => {
        const schema = p.string(p.includes('foo'));

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

    it('rejects invalid values', () => {
        const schema = p.string(p.includes('foo'));

        fc.assert(
            fc.property(
                fc.string().filter((value) => !value.includes('foo')),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'does_not_include' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.includes('foo'));
        expect(modified).not.toEqual(original);
        const branched = p.string(p.includes('foo'), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('startsWith', () => {
    it('accepts valid values', () => {
        const schema = p.string(p.startsWith('foo'));

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

    it('rejects invalid values', () => {
        const schema = p.string(p.startsWith('foo'));

        fc.assert(
            fc.property(
                fc.string().filter((value) => !value.startsWith('foo')),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'does_not_start_with' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.startsWith('foo'));
        expect(modified).not.toEqual(original);
        const branched = p.string(p.startsWith('foo'), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('endsWith', () => {
    it('accepts valid values', () => {
        const schema = p.string(p.endsWith('foo'));

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

    it('rejects invalid values', () => {
        const schema = p.string(p.endsWith('foo'));

        fc.assert(
            fc.property(
                fc.string().filter((value) => !value.endsWith('foo')),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'does_not_end_with' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.endsWith('foo'));
        expect(modified).not.toEqual(original);
        const branched = p.string(p.endsWith('foo'), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('date (string)', () => {
    it('accepts valid values', () => {
        const schema = p.string(p.isoDate());

        fc.assert(
            fc.property(
                fc.date({ min: new Date(0, 0, 1), max: new Date(9999, 11, 31), noInvalidDate: true }).map((value) => {
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

    it('rejects invalid values', () => {
        const schema = p.string(p.isoDate());
        const regex = dateRegex();

        fc.assert(
            fc.property(
                fc.string().filter((value) => !regex.test(value)),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'invalid_date_string' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('is safe from ReDoS', async () => {
        const regex = dateRegex();
        const diagnostics = await check(regex.source, regex.flags.replace('v', 'u'));
        if (diagnostics.status === 'vulnerable') {
            console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
        } else if (diagnostics.status === 'unknown') {
            console.log(`Error: ${diagnostics.error.kind}.`);
        }
        expect(diagnostics.status).toBe('safe');
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.isoDate());
        expect(modified).not.toEqual(original);
        const branched = p.string(p.isoDate(), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('time', () => {
    it('accepts valid values', () => {
        fc.assert(
            fc.property(
                fc.date({ min: new Date(0, 0, 1), max: new Date(9999, 11, 31), noInvalidDate: true }),
                fc.option(fc.integer({ min: 0, max: 8 }), { nil: undefined }),
                (date, precision) => {
                    const data = formatTime(date, precision);
                    const options: { precision?: number } = {};
                    if (precision !== undefined) {
                        options.precision = precision;
                    }

                    const schema = p.string(p.isoTime(options));
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

    it('rejects invalid values', () => {
        const schema = p.string(p.isoTime());

        fc.assert(
            fc.property(
                fc.string().filter((value) => !timeRegex().test(value)),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'invalid_time_string' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('throws on invalid precision', () => {
        fc.assert(
            fc.property(fc.oneof(fc.float({ noInteger: true }), fc.integer({ max: -1 })), (precision) => {
                expect(() => p.isoTime({ precision })).toThrow();
            }),
        );
    });

    it('is safe from ReDoS', () => {
        fc.assert(
            fc.property(fc.option(fc.integer({ min: 0, max: 8 }), { nil: undefined }), (precision) => {
                const regex = timeRegex(precision);
                check(regex.source, regex.flags.replace('v', 'u')).then((diagnostics) => {
                    if (diagnostics.status === 'vulnerable') {
                        console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
                    } else if (diagnostics.status === 'unknown') {
                        console.log(`Error: ${diagnostics.error.kind}.`);
                    }
                    expect(diagnostics.status).toBe('safe');
                });
            }),
            { ignoreEqualValues: true },
        );
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.isoTime());
        expect(modified).not.toEqual(original);
        const branched = p.string(p.isoTime(), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('datetime', () => {
    it('accepts valid values', () => {
        fc.assert(
            fc.property(
                fc.date({ min: new Date(0, 0, 1), max: new Date(9999, 11, 31), noInvalidDate: true }),
                fc.integer({ min: -1000, max: 1000 }),
                fc.option(fc.integer({ min: 0, max: 8 }), { nil: undefined }),
                fc.boolean(),
                fc.boolean(),
                (date, timezone, precision, offset, local) => {
                    const data = formatDatetime(date, timezone, precision, offset, local);
                    const options: { precision?: number; offset?: boolean; local?: boolean } = {};
                    if (precision !== undefined) {
                        options.precision = precision;
                    }
                    if (offset !== undefined) {
                        options.offset = offset;
                    }
                    if (local !== undefined) {
                        options.local = local;
                    }

                    const schema = p.string(p.isoDatetime(options));
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

    it('rejects invalid values', () => {
        const schema = p.string(p.isoDatetime());

        fc.assert(
            fc.property(
                fc.string().filter((value) => !datetimeRegex().test(value)),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'invalid_date_time_string' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('throws on invalid precision', () => {
        fc.assert(
            fc.property(fc.oneof(fc.float({ noInteger: true }), fc.integer({ max: -1 })), (precision) => {
                expect(() => p.isoDatetime({ precision })).toThrow();
            }),
        );
    });

    it('is safe from ReDoS', () => {
        fc.assert(
            fc.property(
                fc.option(fc.integer({ min: 0, max: 8 }), { nil: undefined }),
                fc.boolean(),
                fc.boolean(),
                (precision, offset, local) => {
                    const regex = datetimeRegex(precision, offset, local);
                    check(regex.source, regex.flags.replace('v', 'u')).then((diagnostics) => {
                        if (diagnostics.status === 'vulnerable') {
                            console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
                        } else if (diagnostics.status === 'unknown') {
                            console.log(`Error: ${diagnostics.error.kind}.`);
                        }
                        expect(diagnostics.status).toBe('safe');
                    });
                },
            ),
            { ignoreEqualValues: true },
        );
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.isoDatetime());
        expect(modified).not.toEqual(original);
        const branched = p.string(p.isoDatetime(), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('ip', () => {
    it('accepts valid values', () => {
        const schema = p.string(p.ip());

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

    it('rejects invalid values', () => {
        const schema = p.string(p.ip());

        fc.assert(
            fc.property(
                fc.string().filter((value) => !ipRegex().test(value)),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'invalid_ip_address' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('is safe from ReDoS', () => {
        fc.assert(
            fc.property(fc.constantFrom(4 as const, 6 as const, undefined), (version) => {
                const regex = ipRegex(version);
                check(regex.source, regex.flags.replace('v', 'u'), { timeout: 20_000 }).then((diagnostics) => {
                    if (diagnostics.status === 'vulnerable') {
                        console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
                    } else if (diagnostics.status === 'unknown') {
                        console.log(`Error: ${diagnostics.error.kind}.`);
                    }
                    expect(diagnostics.status).toBe('safe');
                });
            }),
            { ignoreEqualValues: true },
        );
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.ip());
        expect(modified).not.toEqual(original);
        const branched = p.string(p.ip(), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('cidr', () => {
    it('accepts valid values', () => {
        const schema = p.string(p.cidr());

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

    it('rejects invalid values', () => {
        const schema = p.string(p.cidr());

        fc.assert(
            fc.property(
                fc.string().filter((value) => !ipCidrRegex().test(value)),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'invalid_ip_address_range' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('is safe from ReDoS', () => {
        fc.assert(
            fc.property(fc.constantFrom(4 as const, 6 as const, undefined), (version) => {
                const regex = ipCidrRegex(version);
                check(regex.source, regex.flags.replace('v', 'u'), { timeout: 20_000 }).then((diagnostics) => {
                    if (diagnostics.status === 'vulnerable') {
                        console.log(`Vulnerable pattern: ${diagnostics.attack.pattern}`);
                    } else if (diagnostics.status === 'unknown') {
                        console.log(`Error: ${diagnostics.error.kind}.`);
                    }
                    expect(diagnostics.status).toBe('safe');
                });
            }),
            { ignoreEqualValues: true },
        );
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.cidr());
        expect(modified).not.toEqual(original);
        const branched = p.string(p.cidr(), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

describe('regex', () => {
    it('accepts valid values', () => {
        const schema = p.string(p.regex(/^a+$/));

        fc.assert(
            fc.property(fc.string({ minLength: 1, unit: fc.constantFrom('a') }), (data) => {
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

    it('rejects invalid values', () => {
        const regex = /^a+$/;
        const schema = p.string(p.regex(regex));

        fc.assert(
            fc.property(
                fc.string().filter((value) => !regex.test(value)),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'does_not_match_regex' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('produces consistent results with global flag', () => {
        const schema = p.string(p.regex(/^a+$/g));

        fc.assert(
            fc.property(fc.string({ minLength: 1, unit: fc.constantFrom('a') }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('produces consistent results with sticky flag', () => {
        const schema = p.string(p.regex(/^a+$/y));

        fc.assert(
            fc.property(fc.string({ minLength: 1, unit: fc.constantFrom('a') }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = p.string(p.regex(/a+/));
        expect(modified).not.toEqual(original);
        const branched = p.string(p.regex(/a+/), p.minLength(1));
        expect(branched).not.toEqual(modified);
    });
});

it('accepts optional values', () => {
    const schema = p.optional(p.string());

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

it('accepts nullable values', () => {
    const schema = p.nullable(p.string());

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
