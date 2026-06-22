import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import { check } from 'recheck';
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

function formatDate(value: Date): string {
    const year =
        value.getFullYear() >= 0
            ? String(value.getFullYear()).padStart(4, '0')
            : `-${String(Math.abs(value.getFullYear())).padStart(4, '0')}`;
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const date = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${date}`;
}

function formatTimezone(timezone: number, offset?: boolean, local?: boolean): string {
    const timezoneString =
        timezone === 0
            ? 'Z'
            : `${Math.sign(timezone) >= 0 ? '+' : '-'}${String(Math.floor(Math.abs(timezone) / 60)).padStart(2, '0')}:${String(Math.abs(timezone) % 60).padStart(2, '0')}`;

    return local ? '' : offset ? timezoneString : 'Z';
}

function formatTime(value: Date, timezone: number, precision?: number, offset?: boolean, local?: boolean): string {
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

    return `${hour}:${minute}:${second}${fractionString}${formatTimezone(timezone, offset, local)}`;
}

function formatDatetime(value: Date, timezone: number, precision?: number, offset?: boolean, local?: boolean): string {
    return `${formatDate(value)}T${formatTime(value, timezone, precision, offset, local)}`;
}

it('accepts valid types', () => {
    const schema = p.string();

    fc.assert(
        fc.property(fc.string(), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string>();
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

// min and max are exercised over a generated (bound, value) pair; the outcome is derived from the same length
// comparison the schema uses. `length` is split out below because an exact-length match almost never coincides
// with an independently generated bound.
const lengthBoundChecks: readonly {
    readonly name: 'min' | 'max';
    readonly apply: (schema: ReturnType<typeof p.string>, bound: number) => ReturnType<typeof p.string>;
    readonly accepts: (length: number, bound: number) => boolean;
    readonly code: 'too_short' | 'too_long';
}[] = [
    {
        name: 'min',
        apply: (schema, bound) => schema.min(bound),
        accepts: (length, bound) => length >= bound,
        code: 'too_short',
    },
    {
        name: 'max',
        apply: (schema, bound) => schema.max(bound),
        accepts: (length, bound) => length <= bound,
        code: 'too_long',
    },
];

for (const check of lengthBoundChecks) {
    describe(check.name, () => {
        it('accepts in-range and rejects out-of-range values for any bound', () => {
            fc.assert(
                fc.property(fc.nat({ max: 15 }), fc.string({ maxLength: 30 }), (bound, data) => {
                    const schema = check.apply(p.string(), bound);
                    const result = schema.safeParse(data);
                    if (check.accepts(data.length, bound)) {
                        if (result.ok) {
                            expectTypeOf(result.value).toEqualTypeOf<string>();
                            expect(result.value).toBe(data);
                        } else {
                            expect(result.ok).toBeTruthy();
                        }
                    } else {
                        if (!result.ok) {
                            expect(result.messages()).toEqual([{ path: [], message: check.code }]);
                        } else {
                            expect(result.ok).toBeFalsy();
                        }
                    }
                }),
            );
        });

        it('rejects invalid bounds', () => {
            expect(() => check.apply(p.string(), Number.NaN)).toThrow();
            expect(() => check.apply(p.string(), -1)).toThrow();
            expect(() => check.apply(p.string(), 1.5)).toThrow();
            expect(() => check.apply(p.string(), Number.POSITIVE_INFINITY)).toThrow();
            expect(() => check.apply(p.string(), 0)).not.toThrow();
        });

        it('is immutable', () => {
            const original = p.string();
            const modified = check.apply(original, 3);
            expect(modified).not.toEqual(original);
        });
    });
}

describe('length', () => {
    it('accepts a string whose length equals the bound', () => {
        fc.assert(
            fc.property(fc.string({ maxLength: 30 }), (data) => {
                const schema = p.string().length(data.length);
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<string>();
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects a longer string as too_long', () => {
        fc.assert(
            fc.property(fc.string({ maxLength: 30 }), fc.nat({ max: 30 }), (data, bound) => {
                fc.pre(data.length > bound);
                const schema = p.string().length(bound);
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_long' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('rejects a shorter string as too_short', () => {
        fc.assert(
            fc.property(fc.string({ maxLength: 30 }), fc.nat({ max: 30 }), (data, bound) => {
                fc.pre(data.length < bound);
                const schema = p.string().length(bound);
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('rejects invalid bounds', () => {
        expect(() => p.string().length(Number.NaN)).toThrow();
        expect(() => p.string().length(-1)).toThrow();
        expect(() => p.string().length(1.5)).toThrow();
        expect(() => p.string().length(Number.POSITIVE_INFINITY)).toThrow();
        expect(() => p.string().length(0)).not.toThrow();
    });

    it('is immutable', () => {
        const original = p.string();
        const modified = original.length(3);
        expect(modified).not.toEqual(original);
    });
});

describe('email', () => {
    it('accepts valid values', () => {
        const schema = p.string().email();

        fc.assert(
            fc.property(fc.emailAddress(), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<string>();
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.string().email();
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
        const modified = original.email();
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

describe('emoji', () => {
    it('accepts valid values', () => {
        const schema = p.string().emoji();

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
                        expectTypeOf(result.value).toEqualTypeOf<string>();
                        expect(result.value).toBe(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.string().emoji();
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
        const modified = original.emoji();
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

describe('uuid', () => {
    it('accepts valid values', () => {
        const schema = p.string().uuid();

        fc.assert(
            fc.property(fc.uuid(), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<string>();
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.string().uuid();
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
        const modified = original.uuid();
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

describe('nanoid', () => {
    it('accepts valid values', () => {
        const schema = p.string().nanoid();
        // FIXME: fast-check doesn't like case-insensitive regexes.
        const regex = new RegExp(nanoidRegex().source);

        fc.assert(
            fc.property(fc.stringMatching(regex), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<string>();
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.string().nanoid();
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
        const modified = original.nanoid();
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

// Each substring check is exercised over a generated needle rather than a fixed 'foo': accept-data is constructed
// to satisfy the constraint, reject-data is drawn against a non-empty needle and gated so the constraint fails.
const substringChecks: readonly {
    readonly name: 'includes' | 'startsWith' | 'endsWith';
    readonly apply: (schema: ReturnType<typeof p.string>, needle: string) => ReturnType<typeof p.string>;
    readonly build: (needle: string, prefix: string, suffix: string) => string;
    readonly holds: (value: string, needle: string) => boolean;
    readonly code: 'does_not_include' | 'does_not_start_with' | 'does_not_end_with';
}[] = [
    {
        name: 'includes',
        apply: (schema, needle) => schema.includes(needle),
        build: (needle, prefix, suffix) => `${prefix}${needle}${suffix}`,
        holds: (value, needle) => value.includes(needle),
        code: 'does_not_include',
    },
    {
        name: 'startsWith',
        apply: (schema, needle) => schema.startsWith(needle),
        build: (needle, _prefix, suffix) => `${needle}${suffix}`,
        holds: (value, needle) => value.startsWith(needle),
        code: 'does_not_start_with',
    },
    {
        name: 'endsWith',
        apply: (schema, needle) => schema.endsWith(needle),
        build: (needle, prefix) => `${prefix}${needle}`,
        holds: (value, needle) => value.endsWith(needle),
        code: 'does_not_end_with',
    },
];

for (const check of substringChecks) {
    describe(check.name, () => {
        it('accepts strings that satisfy the constraint for any needle', () => {
            fc.assert(
                fc.property(fc.string(), fc.string(), fc.string(), (needle, prefix, suffix) => {
                    const schema = check.apply(p.string(), needle);
                    const data = check.build(needle, prefix, suffix);
                    const result = schema.safeParse(data);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<string>();
                        expect(result.value).toBe(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                }),
            );
        });

        it('rejects strings that violate the constraint', () => {
            fc.assert(
                fc.property(fc.string({ minLength: 1 }), fc.string(), (needle, data) => {
                    fc.pre(!check.holds(data, needle));
                    const schema = check.apply(p.string(), needle);
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: check.code }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                }),
            );
        });

        it('is immutable', () => {
            const original = p.string();
            const modified = check.apply(original, 'foo');
            expect(modified).not.toEqual(original);
        });
    });
}

describe('date (string)', () => {
    it('accepts valid values', () => {
        const schema = p.string().date();

        fc.assert(
            fc.property(
                fc.date({ min: new Date(0, 0, 1), max: new Date(9999, 11, 31), noInvalidDate: true }).map((value) => {
                    return formatDate(value);
                }),
                (data) => {
                    const result = schema.safeParse(data);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<string>();
                        expect(result.value).toBe(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.string().date();
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
        const modified = original.date();
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

describe('time', () => {
    it('accepts valid values', () => {
        fc.assert(
            fc.property(
                fc.date({ min: new Date(0, 0, 1), max: new Date(9999, 11, 31), noInvalidDate: true }),
                fc.integer({ min: -1000, max: 1000 }),
                fc.option(fc.integer({ min: 0, max: 8 }), { nil: undefined }),
                fc.boolean(),
                fc.boolean(),
                (date, timezone, precision, offset, local) => {
                    const data = formatTime(date, timezone, precision, offset, local);
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

                    const schema = p.string().time(options);
                    const result = schema.safeParse(data);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<string>();
                        expect(result.value).toBe(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.string().time();

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
                expect(() => p.string().time({ precision })).toThrow();
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
                    const regex = timeRegex(precision, offset, local);
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
        const modified = original.time();
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
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

                    const schema = p.string().datetime(options);
                    const result = schema.safeParse(data);
                    if (result.ok) {
                        expectTypeOf(result.value).toEqualTypeOf<string>();
                        expect(result.value).toBe(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.string().datetime();

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
                expect(() => p.string().datetime({ precision })).toThrow();
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
        const modified = original.datetime();
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

describe('ip', () => {
    it('accepts valid values', () => {
        const schema = p.string().ip();

        fc.assert(
            fc.property(fc.oneof(fc.ipV4(), fc.ipV6()), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<string>();
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.string().ip();

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
        const modified = original.ip();
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

describe('cidr', () => {
    it('accepts valid values', () => {
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
                        expectTypeOf(result.value).toEqualTypeOf<string>();
                        expect(result.value).toBe(data);
                    } else {
                        expect(result.ok).toBeTruthy();
                    }
                },
            ),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.string().cidr();

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
        const modified = original.cidr();
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

describe('regex', () => {
    it('accepts valid values', () => {
        const schema = p.string().regex(/^a+$/);

        fc.assert(
            fc.property(fc.string({ minLength: 1, unit: fc.constantFrom('a') }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<string>();
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const regex = /^a+$/;
        const schema = p.string().regex(regex);

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
        const schema = p.string().regex(/^a+$/g);

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
        const schema = p.string().regex(/^a+$/y);

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
        const modified = original.regex(/a+/);
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

it('accepts optional values', () => {
    const schema = p.string().optional();

    fc.assert(
        fc.property(fc.option(fc.string(), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string | undefined>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.string().nullable();

    fc.assert(
        fc.property(fc.option(fc.string(), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string | null>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
