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
    ipCidrRegex,
    ipRegex,
    nanoidRegex,
    timeRegex,
    urlRegex,
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

describe('contradictory bounds', () => {
    it('throws when the minimum length exceeds the maximum length', () => {
        expect(() => p.string().min(5).max(3)).toThrow('Minimum length must not exceed maximum length.');
        expect(() => p.string().max(3).min(5)).toThrow('Minimum length must not exceed maximum length.');
    });

    it('allows equal minimum and maximum lengths', () => {
        expect(() => p.string().min(3).max(3)).not.toThrow();
    });

    it('throws when a fixed length contradicts an existing bound', () => {
        fc.assert(
            fc.property(fc.nat({ max: 50 }), fc.nat({ max: 50 }), (bound, length) => {
                // A fixed `length` clashes with an existing minimum exactly when it falls below it, and with an
                // existing maximum exactly when it rises above it — the same comparisons min()/max() guard on.
                const minThenLength = () => p.string().min(bound).length(length);
                if (length < bound) {
                    expect(minThenLength).toThrow('Minimum length must not exceed maximum length.');
                } else {
                    expect(minThenLength).not.toThrow();
                }

                const maxThenLength = () => p.string().max(bound).length(length);
                if (length > bound) {
                    expect(maxThenLength).toThrow('Minimum length must not exceed maximum length.');
                } else {
                    expect(maxThenLength).not.toThrow();
                }
            }),
        );
    });
});

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
            // Pin an interior-hyphen domain — a valid case the generator may not produce.
            { examples: [['foo@a-b.com']] },
        );
    });

    it('rejects invalid values', () => {
        // Each violates the address grammar (RFC 5321 / 5322); the hyphen cases violate the RFC 1123 label
        // rule (a label may not begin or end with '-').
        const schema = p.string().email();
        const invalid = [
            'plainaddress', // no @
            '@example.com', // no local part
            'foo@', // no domain
            'foo@.com', // empty label
            'foo@bar..com', // empty interior label
            'foo@-bar.com', // label begins with a hyphen
            'foo@bar-.com', // label ends with a hyphen
            'foo bar@example.com', // unquoted space in the local part
            // U+017F (long s) and U+212A (Kelvin sign) are the only code points that case-fold into ASCII
            // a-z, so they must not slip into the grammar's letter classes: RFC 5321 atext and RFC 1035
            // domain labels are ASCII-only.
            'ſ@example.com', // long s in the local part
            'Kelvin@example.com', // Kelvin sign in the local part
            'user@example.coK', // Kelvin sign in the top-level domain
        ];
        for (const value of invalid) {
            const result = schema.safeParse(value);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'invalid_email' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }
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

describe('url', () => {
    // Mixes well-formed URLs, arbitrary junk, and scheme/host/port/path combinations (including
    // out-of-range ports and non-http schemes) to exercise both the fast-accept path and the
    // `URL.canParse` fall-through.
    const urlLike = fc.oneof(
        fc.webUrl({ withQueryParameters: true, withFragments: true }),
        fc.string(),
        fc
            .tuple(
                fc.constantFrom(
                    'http://',
                    'https://',
                    'ftp://',
                    'ws://',
                    'wss://',
                    'mailto:',
                    'tel:',
                    'urn:',
                    'custom:',
                    'file:///',
                    'ht!tp://',
                ),
                fc.domain(),
                fc.option(fc.integer({ min: 0, max: 99999 }), { nil: undefined }),
                fc.option(fc.webPath(), { nil: undefined }),
            )
            .map(
                ([scheme, host, port, path]) => `${scheme}${host}${port !== undefined ? `:${port}` : ''}${path ?? ''}`,
            ),
        // All-numeric / dotted-numeric hosts: the WHATWG parser treats these as IPv4 candidates and rejects the
        // invalid ones (overflow, wrong part count, out-of-range octets), so the fast-accept host class must not
        // match them. Guards against over-acceptance the letter-host `fc.domain()` arm above can't reach.
        fc
            .tuple(
                fc.constantFrom('http://', 'https://', 'ftp://', 'ws://', 'wss://'),
                fc
                    .array(fc.integer({ min: 0, max: 9999 }), { minLength: 1, maxLength: 6 })
                    .map((parts) => parts.join('.')),
                fc.option(fc.webPath(), { nil: undefined }),
            )
            .map(([scheme, host, path]) => `${scheme}${host}${path ?? ''}`),
        // U+017F (long s) and U+212A (Kelvin sign) are the only code points that case-fold into ASCII a-z.
        // The WHATWG parser rejects them in a scheme (a scheme is ASCII-only), so the fast-accept must not
        // let a case-insensitive letter class match them there.
        fc
            .tuple(
                fc.constantFrom('http', 'ws', 'w', 'ftp', 'custom', ''),
                fc.constantFrom('ſ', 'K'),
                fc.constantFrom(':foo', '://example.com', 'cheme:bar', 'ttp://example.com'),
            )
            .map(([prefix, fold, rest]) => `${prefix}${fold}${rest}`),
        // xn-- labels (any case) are punycode-decoded and validated by the WHATWG host parser, so some
        // pure-ASCII hosts are rejected (invalid punycode) while others are fine: the fast-accept must
        // defer all of them to `URL.canParse`.
        fc
            .tuple(
                fc.constantFrom('http://', 'https://', 'ws://'),
                fc.constantFrom('', 'a.', 'sub.example.'),
                fc.constantFrom('xn--', 'XN--', 'xN--a', 'xn---', 'xn--a', 'xn--zzz', 'xn--nxasmq6b', 'axn--b'),
                fc.constantFrom('', '.com', '.xn--a', '.example.com'),
                fc.constantFrom('', ':8080', '/path', '?q=1'),
            )
            .map(([scheme, prefix, label, suffix, tail]) => `${scheme}${prefix}${label}${suffix}${tail}`),
        // A host whose LAST label is a number (all digits, or 0x/0X-prefixed hex, including bare 0x) is
        // IPv4-parsed by the WHATWG parser and often rejected, regardless of any letters in earlier labels;
        // the fast-accept must defer those. Non-numeric last labels (0x1g, 12a, 1-2) stay on the fast path.
        fc
            .tuple(
                fc.constantFrom('http://', 'https://', 'wss://'),
                fc.constantFrom('', 'a.', 'a.b.', '0.', '_.'),
                fc.constantFrom('1', '123', '999999999999', '0x', '0X', '0x1f', '0X1F', '0x1g', '12a', '1-2', 'a1'),
                fc.constantFrom('', '.', ':80', '/p', '?q'),
            )
            .map(([scheme, prefix, label, tail]) => `${scheme}${prefix}${label}${tail}`),
    );

    it('agrees with URL.canParse on every input', () => {
        const schema = p.string().url();

        // Oracle is the WHATWG parser (`URL.canParse`), the canonical semantics `url()` promises.
        // This pins the fast-accept pre-filter's soundness: it must never flip the verdict.
        fc.assert(
            fc.property(urlLike, (data) => {
                expect(schema.safeParse(data).ok).toBe(URL.canParse(data));
            }),
            {
                numRuns: 1000,
                examples: [
                    ['Kelvin:foo'],
                    ['ſcheme:foo'],
                    ['httpſ://example.com'],
                    ['http://xn--a.com'],
                    ['http://XN--a.com'],
                    ['http://a.xn---.com'],
                    ['http://bcc.0'],
                    ['http://a.1'],
                    ['http://_.1'],
                    ['http://a.0x'],
                    ['http://a.0X1f'],
                    ['http://example.com.'],
                    ['http://a..com'],
                ],
            },
        );
    });

    it('accepts valid values', () => {
        const schema = p.string().url();

        fc.assert(
            fc.property(fc.webUrl({ withQueryParameters: true, withFragments: true }), (data) => {
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
        const schema = p.string().url();

        fc.assert(
            fc.property(
                fc.string().filter((value) => !URL.canParse(value)),
                (data) => {
                    const result = schema.safeParse(data);
                    if (!result.ok) {
                        expect(result.messages()).toEqual([{ path: [], message: 'invalid_url' }]);
                    } else {
                        expect(result.ok).toBeFalsy();
                    }
                },
            ),
        );
    });

    it('is safe from ReDoS', async () => {
        const regex = urlRegex();
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
        const modified = original.url();
        expect(modified).not.toEqual(original);
        const branched = modified.min(1);
        expect(branched).not.toEqual(modified);
    });
});

describe('emoji', () => {
    it('accepts valid values', () => {
        const schema = p.string().emoji();

        fc.assert(
            fc.property(fc.constantFrom(...emoji), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<string>();
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
            // Pin a multi-emoji string to exercise the one-or-more quantifier.
            { examples: [['😀🇦🇺👍🏽']] },
        );
    });

    it('rejects invalid values', () => {
        // Bare Emoji_Component code points are not standalone emoji (UTS #51 ED-13); they appear only inside
        // sequences (keycaps, flags), which `\p{RGI_Emoji}` matches as whole units.
        const schema = p.string().emoji();
        const invalid = [
            '#', // keycap base without its sequence
            '*',
            '1',
            '123',
            '\u{1F1FA}', // a lone regional indicator (half a flag)
            '\uFE0F', // a lone variation selector
            'abc', // not emoji at all
        ];
        for (const value of invalid) {
            const result = schema.safeParse(value);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'invalid_emoji' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }
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

        // Inputs built invalid by construction from the 8-4-4-4-12 hex grammar.
        const hexCharacter = fc.constantFrom(...'0123456789abcdefABCDEF');
        const groups = fc.tuple(
            ...[8, 4, 4, 4, 12].map((length) =>
                fc.string({ unit: hexCharacter, minLength: length, maxLength: length }),
            ),
        );
        const groupIndex = fc.nat({ max: 4 });
        const invalid = fc.oneof(
            // A non-hex letter in one group.
            fc.tuple(groups, groupIndex, fc.constantFrom(...'ghijklmnopqrstuvwxyz')).map(([parts, index, letter]) => {
                const mutated = [...parts];
                mutated[index] = `${letter}${mutated[index].slice(1)}`;
                return mutated.join('-');
            }),
            // One group a character short.
            fc.tuple(groups, groupIndex).map(([parts, index]) => {
                const mutated = [...parts];
                mutated[index] = mutated[index].slice(1);
                return mutated.join('-');
            }),
            // One group a character long.
            fc.tuple(groups, groupIndex, hexCharacter).map(([parts, index, extra]) => {
                const mutated = [...parts];
                mutated[index] = `${mutated[index]}${extra}`;
                return mutated.join('-');
            }),
            // Too few groups.
            groups.map((parts) => parts.slice(0, 4).join('-')),
        );

        fc.assert(
            fc.property(invalid, (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_uuid' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
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

        // Inputs built invalid by construction: a Nano ID is exactly 21 characters of [A-Za-z0-9_-].
        const alphabetCharacter = fc.constantFrom(
            ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-',
        );
        const invalid = fc.oneof(
            // Wrong length.
            fc.string({ unit: alphabetCharacter, maxLength: 30 }).filter((value) => value.length !== 21),
            // A character outside the alphabet.
            fc
                .tuple(
                    fc.string({ unit: alphabetCharacter, minLength: 20, maxLength: 20 }),
                    fc.nat({ max: 20 }),
                    fc.constantFrom(...'!@#$%^&*()+= .,/\\'),
                )
                .map(([body, index, character]) => body.slice(0, index) + character + body.slice(index)),
        );

        fc.assert(
            fc.property(invalid, (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_nanoid' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
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

        // Inputs built invalid by construction from the RFC 3339 full-date grammar.
        const year = fc.integer({ min: 0, max: 9999 }).map((value) => String(value).padStart(4, '0'));
        const isLeapYear = (value: number): boolean => (value % 4 === 0 && value % 100 !== 0) || value % 400 === 0;
        const paddedNumber = (value: number): string => String(value).padStart(2, '0');
        const invalid = fc.oneof(
            // Month 00 or past 12.
            fc
                .tuple(year, fc.oneof(fc.constant(0), fc.integer({ min: 13, max: 99 })))
                .map(([yearString, month]) => `${yearString}-${paddedNumber(month)}-01`),
            // Day 00 or past 31.
            fc
                .tuple(
                    year,
                    fc.integer({ min: 1, max: 12 }),
                    fc.oneof(fc.constant(0), fc.integer({ min: 32, max: 99 })),
                )
                .map(([yearString, month, day]) => `${yearString}-${paddedNumber(month)}-${paddedNumber(day)}`),
            // Day 31 in a 30-day month.
            fc
                .tuple(year, fc.constantFrom(4, 6, 9, 11))
                .map(([yearString, month]) => `${yearString}-${paddedNumber(month)}-31`),
            // 30 February.
            year.map((yearString) => `${yearString}-02-30`),
            // 29 February in a non-leap year, including the century rule (1900 is not a leap year).
            fc
                .integer({ min: 1, max: 9999 })
                .filter((value) => !isLeapYear(value))
                .map((value) => `${String(value).padStart(4, '0')}-02-29`),
            // Unpadded month and day.
            fc
                .tuple(year, fc.integer({ min: 1, max: 9 }), fc.integer({ min: 1, max: 9 }))
                .map(([yearString, month, day]) => `${yearString}-${month}-${day}`),
        );

        fc.assert(
            fc.property(invalid, (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_date_string' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
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

        // Inputs built invalid by construction from the RFC 3339 partial-time grammar.
        const paddedNumber = (value: number): string => String(value).padStart(2, '0');
        const hour = fc.integer({ min: 0, max: 23 });
        const minute = fc.integer({ min: 0, max: 59 });
        const second = fc.integer({ min: 0, max: 59 });
        const invalid = fc.oneof(
            // Hour past 23.
            fc
                .tuple(fc.integer({ min: 24, max: 99 }), minute, second)
                .map(
                    ([hours, minutes, seconds]) =>
                        `${paddedNumber(hours)}:${paddedNumber(minutes)}:${paddedNumber(seconds)}`,
                ),
            // Minute past 59.
            fc
                .tuple(hour, fc.integer({ min: 60, max: 99 }), second)
                .map(
                    ([hours, minutes, seconds]) =>
                        `${paddedNumber(hours)}:${paddedNumber(minutes)}:${paddedNumber(seconds)}`,
                ),
            // Second past 60 (60 itself is a leap-second profile choice, so it is not drawn).
            fc
                .tuple(hour, minute, fc.integer({ min: 61, max: 99 }))
                .map(
                    ([hours, minutes, seconds]) =>
                        `${paddedNumber(hours)}:${paddedNumber(minutes)}:${paddedNumber(seconds)}`,
                ),
            // Missing seconds.
            fc.tuple(hour, minute).map(([hours, minutes]) => `${paddedNumber(hours)}:${paddedNumber(minutes)}`),
            // Unpadded hour.
            fc
                .tuple(fc.integer({ min: 0, max: 9 }), minute, second)
                .map(([hours, minutes, seconds]) => `${hours}:${paddedNumber(minutes)}:${paddedNumber(seconds)}`),
        );

        fc.assert(
            fc.property(invalid, (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_time_string' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('rejects a timezone offset hour past 23', () => {
        // The offset hour is 00-23 (RFC 3339 time-hour), not the 00-59 a minutes-style class would allow.
        const schema = p.string().time({ offset: true });
        expect(schema.safeParse('12:34:56+45:00').ok).toBe(false);
        expect(schema.safeParse('12:34:56+24:00').ok).toBe(false);
        expect(schema.safeParse('12:34:56+23:59').ok).toBe(true);
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

        // Inputs built invalid by construction: an invalid part on one side of the T, a missing T,
        // or a missing timezone (the default datetime() accepts only UTC 'Z').
        const invalid = fc.oneof(
            // Hour past 23.
            fc.integer({ min: 24, max: 99 }).map((hours) => `2024-01-01T${hours}:00:00Z`),
            // Minute past 59.
            fc.integer({ min: 60, max: 99 }).map((minutes) => `2024-01-01T12:${minutes}:00Z`),
            // Month past 12.
            fc.integer({ min: 13, max: 99 }).map((months) => `2024-${months}-01T12:34:56Z`),
            // Day past 31.
            fc.integer({ min: 32, max: 99 }).map((days) => `2024-01-${days}T12:34:56Z`),
            // No timezone.
            fc.constant('2024-01-01T12:34:56'),
            // A space instead of the T separator.
            fc.constant('2024-01-01 12:34:56Z'),
        );

        fc.assert(
            fc.property(invalid, (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_date_time_string' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('rejects a timezone offset hour past 23', () => {
        // The offset hour is 00-23 (RFC 3339 time-hour), not the 00-59 a minutes-style class would allow.
        const schema = p.string().datetime({ offset: true });
        expect(schema.safeParse('2024-01-01T12:34:56+45:00').ok).toBe(false);
        expect(schema.safeParse('2024-01-01T12:34:56+24:00').ok).toBe(false);
        expect(schema.safeParse('2024-01-01T12:34:56+23:59').ok).toBe(true);
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

        // Inputs built invalid by construction from the RFC 791/4291 grammar.
        const octet = fc.integer({ min: 0, max: 255 });
        const segment = fc.stringMatching(/^[0-9a-fA-F]{1,4}$/);
        const invalid = fc.oneof(
            // IPv4 needs dots and IPv6 needs colons, so a string with neither is never an IP address.
            fc.string().filter((value) => !value.includes('.') && !value.includes(':')),
            // An IPv4 octet past 255.
            fc
                .tuple(
                    fc.array(octet, { minLength: 4, maxLength: 4 }),
                    fc.nat({ max: 3 }),
                    fc.integer({ min: 256, max: 999 }),
                )
                .map(([octets, position, excess]) => {
                    const parts = octets.map(String);
                    parts[position] = String(excess);
                    return parts.join('.');
                }),
            // Five octets.
            fc.array(octet, { minLength: 5, maxLength: 5 }).map((octets) => octets.join('.')),
            // Nine colon-separated groups (IPv6 allows at most eight).
            fc.array(segment, { minLength: 9, maxLength: 9 }).map((segments) => segments.join(':')),
            // A group of five hex digits (IPv6 groups are one to four).
            fc
                .tuple(fc.array(segment, { minLength: 8, maxLength: 8 }), fc.nat({ max: 7 }))
                .map(([segments, position]) => {
                    segments[position] = '12345';
                    return segments.join(':');
                }),
            // Two '::' compressions (IPv6 allows at most one).
            fc.tuple(segment, segment, segment).map(([first, second, third]) => `${first}::${second}::${third}`),
        );

        fc.assert(
            fc.property(invalid, (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_ip_address' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('rejects Unicode characters that case-fold into ASCII in the zone ID', () => {
        // U+017F (long s) and U+212A (Kelvin sign) are the only code points that case-fold into ASCII
        // a-z, so they must not slip into the zone ID class: RFC 6874 zone IDs are ASCII-only.
        const schema = p.string().ip();

        expect(schema.safeParse('fe80::1%eth0').ok).toBeTruthy();
        expect(schema.safeParse('fe80::1%ETH0').ok).toBeTruthy();
        const invalid = [
            'fe80::1%K1', // Kelvin sign in the zone ID
            'fe80::1%ſ1', // long s in the zone ID
        ];
        for (const value of invalid) {
            const result = schema.safeParse(value);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'invalid_ip_address' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }
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

        // Inputs built invalid by construction.
        const invalid = fc.oneof(
            // A bare address: CIDR notation requires the /prefix suffix.
            fc.oneof(fc.ipV4(), fc.ipV6()),
            // Prefix length past the maximum (32 for IPv4, 128 for IPv6).
            fc.tuple(fc.ipV4(), fc.integer({ min: 33, max: 999 })).map(([ip, bits]) => `${ip}/${bits}`),
            fc.tuple(fc.ipV6(), fc.integer({ min: 129, max: 999 })).map(([ip, bits]) => `${ip}/${bits}`),
            // An invalid address before the prefix: no dots or colons is never an IP address.
            fc
                .tuple(
                    fc.string().filter((value) => !value.includes('.') && !value.includes(':')),
                    fc.integer({ min: 0, max: 128 }),
                )
                .map(([address, bits]) => `${address}/${bits}`),
        );

        fc.assert(
            fc.property(invalid, (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_ip_address_range' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('rejects Unicode characters that case-fold into ASCII in the zone ID', () => {
        // U+017F (long s) and U+212A (Kelvin sign) are the only code points that case-fold into ASCII
        // a-z, so they must not slip into the zone ID class: RFC 6874 zone IDs are ASCII-only.
        const schema = p.string().cidr();

        expect(schema.safeParse('fe80::1%eth0/64').ok).toBeTruthy();
        expect(schema.safeParse('fe80::1%ETH0/64').ok).toBeTruthy();
        const invalid = [
            'fe80::1%K1/64', // Kelvin sign in the zone ID
            'fe80::1%ſ1/64', // long s in the zone ID
        ];
        for (const value of invalid) {
            const result = schema.safeParse(value);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'invalid_ip_address_range' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }
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
