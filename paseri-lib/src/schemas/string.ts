import { pattern, regex } from 'regex';
import { type LeafNode, type TreeNode, issueCodes } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

// User part validation adapted from https://github.com/validatorjs/validator.js/blob/master/src/lib/isEmail.js.
const emailRegex = (): RegExp => regex('i')`
    ^ \g<email> $

    (?(DEFINE)
        (?<email> \g<user-part> (\. \g<user-part>)* @ \g<domain>)
        # Literal backtick leads to compatibility issues with u flag.
        (?<user-part> [a-z\d!#$%&'*\-\/=?^_\u0060\{\|\}~+]+)
        # The smallest allowable top-level domain is 2 characters (country codes).
        (?<domain> ([a-z\d][a-z\d\-]*\.)+ [a-z]{2,})
    )
`;
// Atomic group here to prevent ReDoS.
const emojiRegex = (): RegExp => regex`^(\p{Extended_Pictographic} | \p{Emoji_Component})++$`;
// Conversion of UUID regex from https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js.
const uuidRegex = (): RegExp => regex('i')`
    ^ (\g<uuid> | \g<uuid-min> | \g<uuid-max>) $

    (?(DEFINE)
        (?<uuid> \p{AHex}{8}-\p{AHex}{4}-[1-8]\p{AHex}{3}-[89ab]\p{AHex}{3}-\p{AHex}{12})
        (?<uuid-min> 00000000-0000-0000-0000-000000000000)
        (?<uuid-max> ffffffff-ffff-ffff-ffff-ffffffffffff)
    )
`;
const nanoidRegex = (): RegExp => /^[a-z\d_-]{21}$/i;
const dateRegex = (): RegExp => regex`
    ^ \g<date> $

    (?(DEFINE)
        (?<date> (\g<leap-date> | \d{4}-(\g<with-31> | \g<with-30> | \g<february>)))
        (?<leap-date> (\d\d[2468][048] | \d\d[13579][26] | \d\d0[48] | [02468][048]00 | [13579][26]00)-02-29)
        (?<with-31> (0[13578] | 1[02])-(0[1-9] | [12]\d | 3[01]))
        (?<with-30> (0[469] | 11)-(0[1-9] | [12]\d|30))
        (?<february> 02-(0[1-9] | 1\d | 2[0-8]))
    )
`;
const timeRegex = (precision?: number): RegExp => regex`
    ^ \g<time> $

    (?(DEFINE)
        (?<time> \g<hours> : \g<minutes> : \g<seconds> \g<fractional-seconds>)
        (?<hours> ([01]\d | 2[0-3]))
        (?<minutes> [0-5]\d)
        (?<seconds> [0-5]\d)
        (?<fractional-seconds> ${precision === undefined ? pattern`(\.\d+)?` : pattern`\.\d{${String(precision)}}`})
    )
`;
const datetimeRegex = (precision?: number, offset?: boolean, local?: boolean): RegExp => regex`
    ^ \g<datetime> $

    (?(DEFINE)
        (?<datetime> \g<date> T \g<time> \g<timezone>)
        (?<date> (\g<leap-date> | \d{4}-(\g<with-31> | \g<with-30> | \g<february>)))
        (?<leap-date> (\d\d[2468][048] | \d\d[13579][26] | \d\d0[48] | [02468][048]00 | [13579][26]00)-02-29)
        (?<with-31> (0[13578] | 1[02])-(0[1-9] | [12]\d | 3[01]))
        (?<with-30> (0[469] | 11)-(0[1-9] | [12]\d|30))
        (?<february> 02-(0[1-9] | 1\d | 2[0-8]))
        (?<time> \g<hours> : \g<minutes> : \g<seconds> \g<fractional-seconds>)
        (?<hours> ([01]\d | 2[0-3]))
        (?<minutes> [0-5]\d)
        (?<seconds> [0-5]\d)
        (?<fractional-seconds> ${precision === undefined ? pattern`(\.\d+)?` : pattern`\.\d{${String(precision)}}`})
        (?<timezone> ${offset && local ? pattern`(\g<offset> | Z?)` : offset ? pattern`(\g<offset> | Z)` : local ? pattern`Z?` : pattern`Z`})
        (?<offset> [+\-][0-5]\d:[0-5]\d)
    )
`;
// Adapted IP regex from https://github.com/validatorjs/validator.js/blob/master/src/lib/isIP.js.
const ipRegex = (version?: 4 | 6): RegExp => regex('i')`
    ^ \g<ip> $

    (?(DEFINE)
        (?<ip> ${version === undefined ? pattern`(\g<ipv4> | \g<ipv6>)` : version === 4 ? pattern`\g<ipv4>` : pattern`\g<ipv6>`})
        (?<ipv6>
            (
                (\g<segment> :){7} (\g<segment> | :) |
                (\g<segment> :){6} (\g<ipv4> | : \g<segment> | :) |
                (\g<segment> :){5} (: \g<ipv4> | (: \g<segment>){1,2} | :) |
                (\g<segment> :){4} ((: \g<segment>){0,1} : \g<ipv4> | (: \g<segment>){1,3} | :) |
                (\g<segment> :){3} ((: \g<segment>){0,2} : \g<ipv4> | (: \g<segment>){1,4} | :) |
                (\g<segment> :){2} ((: \g<segment>){0,3} : \g<ipv4> | (: \g<segment>){1,5} | :) |
                (\g<segment> :){1} ((: \g<segment>){0,4} : \g<ipv4> | (: \g<segment>){1,6} | :) |
                (: ((: \g<segment>){0,5} : \g<ipv4> | (: \g<segment>){1,7} | :))
            )
            (% [\da-z]+)?
        )
        (?<segment> \p{AHex}{1,4})
        (?<ipv4> (\g<byte> \.){3} \g<byte>)
        (?<byte> 25[0-5] | 2[0-4]\d | 1\d\d | [1-9]\d | \d)
    )
`;
const ipCidrRegex = (version?: 4 | 6): RegExp => regex('i')`
    ^ \g<ip-range> $

    (?(DEFINE)
        (?<ip-range> ${version === undefined ? pattern`(\g<ipv4-range> | \g<ipv6-range>)` : version === 4 ? pattern`\g<ipv4-range>` : pattern`\g<ipv6-range>`})
        (?<ipv6-range> \g<ipv6> / \g<ipv6-bits>)
        (?<ipv6>
            (
                (\g<segment> :){7} (\g<segment> | :) |
                (\g<segment> :){6} (\g<ipv4> | : \g<segment> | :) |
                (\g<segment> :){5} (: \g<ipv4> | (: \g<segment>){1,2} | :) |
                (\g<segment> :){4} ((: \g<segment>){0,1} : \g<ipv4> | (: \g<segment>){1,3} | :) |
                (\g<segment> :){3} ((: \g<segment>){0,2} : \g<ipv4> | (: \g<segment>){1,4} | :) |
                (\g<segment> :){2} ((: \g<segment>){0,3} : \g<ipv4> | (: \g<segment>){1,5} | :) |
                (\g<segment> :){1} ((: \g<segment>){0,4} : \g<ipv4> | (: \g<segment>){1,6} | :) |
                (: ((: \g<segment>){0,5} : \g<ipv4> | (: \g<segment>){1,7} | :))
            )
            (% [\da-z]+)?
        )
        (?<ipv6-bits> (12[0-8] | 1[01]\d | \d{1,2}))
        (?<segment> \p{AHex}{1,4})
        (?<ipv4-range> \g<ipv4> / \g<ipv4-bits>)
        (?<ipv4> (\g<byte> \.){3} \g<byte>)
        (?<ipv4-bits> (3[0-2] | 2\d | 1\d | \d))
        (?<byte> 25[0-5] | 2[0-4]\d | 1\d\d | [1-9]\d | \d)
    )
`;

type CheckFunction = (value: string) => TreeNode | undefined;

class StringSchema extends Schema<string> {
    private _checks: CheckFunction[] | undefined = undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'string' },
        TOO_SHORT: { type: 'leaf', code: issueCodes.TOO_SHORT },
        TOO_LONG: { type: 'leaf', code: issueCodes.TOO_LONG },
        INVALID_EMAIL: { type: 'leaf', code: issueCodes.INVALID_EMAIL },
        INVALID_EMOJI: { type: 'leaf', code: issueCodes.INVALID_EMOJI },
        INVALID_UUID: { type: 'leaf', code: issueCodes.INVALID_UUID },
        INVALID_NANOID: { type: 'leaf', code: issueCodes.INVALID_NANOID },
        DOES_NOT_INCLUDE: { type: 'leaf', code: issueCodes.DOES_NOT_INCLUDE },
        DOES_NOT_START_WITH: { type: 'leaf', code: issueCodes.DOES_NOT_START_WITH },
        DOES_NOT_END_WITH: { type: 'leaf', code: issueCodes.DOES_NOT_END_WITH },
        INVALID_DATE_STRING: { type: 'leaf', code: issueCodes.INVALID_DATE_STRING },
        INVALID_TIME_STRING: { type: 'leaf', code: issueCodes.INVALID_TIME_STRING },
        INVALID_DATE_TIME_STRING: { type: 'leaf', code: issueCodes.INVALID_DATE_TIME_STRING },
        INVALID_IP_ADDRESS: { type: 'leaf', code: issueCodes.INVALID_IP_ADDRESS },
        INVALID_IP_ADDRESS_RANGE: { type: 'leaf', code: issueCodes.INVALID_IP_ADDRESS_RANGE },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): StringSchema {
        const cloned = new StringSchema();
        cloned._checks = this._checks?.slice();

        return cloned;
    }
    _parse(value: unknown): InternalParseResult<string> {
        if (typeof value !== 'string') {
            return this.issues.INVALID_TYPE;
        }

        if (this._checks !== undefined) {
            for (const check of this._checks) {
                const issue = check(value);
                if (issue) {
                    return issue;
                }
            }
        }

        return undefined;
    }
    min(length: number): StringSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value.length < length) {
                return this.issues.TOO_SHORT;
            }
        });

        return cloned;
    }
    max(length: number): StringSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value.length > length) {
                return this.issues.TOO_LONG;
            }
        });

        return cloned;
    }
    length(length: number): StringSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value.length > length) {
                return this.issues.TOO_LONG;
            }

            if (_value.length < length) {
                return this.issues.TOO_SHORT;
            }
        });

        return cloned;
    }
    email(): StringSchema {
        const regex = emailRegex();

        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!regex.test(_value)) {
                return this.issues.INVALID_EMAIL;
            }
        });

        return cloned;
    }
    emoji(): StringSchema {
        const regex = emojiRegex();

        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!regex.test(_value)) {
                return this.issues.INVALID_EMOJI;
            }
        });

        return cloned;
    }
    uuid(): StringSchema {
        const regex = uuidRegex();

        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!regex.test(_value)) {
                return this.issues.INVALID_UUID;
            }
        });

        return cloned;
    }
    nanoid(): StringSchema {
        const regex = nanoidRegex();

        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!regex.test(_value)) {
                return this.issues.INVALID_NANOID;
            }
        });

        return cloned;
    }
    includes(searchString: string): StringSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!_value.includes(searchString)) {
                return this.issues.DOES_NOT_INCLUDE;
            }
        });

        return cloned;
    }
    startsWith(searchString: string): StringSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!_value.startsWith(searchString)) {
                return this.issues.DOES_NOT_START_WITH;
            }
        });

        return cloned;
    }
    endsWith(searchString: string): StringSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!_value.endsWith(searchString)) {
                return this.issues.DOES_NOT_END_WITH;
            }
        });

        return cloned;
    }
    date(): StringSchema {
        const regex = dateRegex();

        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!regex.test(_value)) {
                return this.issues.INVALID_DATE_STRING;
            }
        });

        return cloned;
    }
    time(options: { precision?: number } = {}): StringSchema {
        const regex = timeRegex(options.precision);

        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!regex.test(_value)) {
                return this.issues.INVALID_TIME_STRING;
            }
        });

        return cloned;
    }
    datetime(options: { precision?: number; offset?: boolean; local?: boolean } = {}): StringSchema {
        const regex = datetimeRegex(options.precision, options.offset, options.local);

        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!regex.test(_value)) {
                return this.issues.INVALID_DATE_TIME_STRING;
            }
        });

        return cloned;
    }
    ip(options: { version?: 4 | 6 } = {}): StringSchema {
        const regex = ipRegex(options.version);

        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!regex.test(_value)) {
                return this.issues.INVALID_IP_ADDRESS;
            }
        });

        return cloned;
    }
    cidr(options: { version?: 4 | 6 } = {}): StringSchema {
        const regex = ipCidrRegex(options.version);

        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!regex.test(_value)) {
                return this.issues.INVALID_IP_ADDRESS_RANGE;
            }
        });

        return cloned;
    }
}

const singleton = /* @__PURE__ */ new StringSchema();

/**
 * [String](https://paseri.dev/reference/schema/primitives/string/) schema.
 */
const string = /* @__PURE__ */ (): StringSchema => singleton;

export {
    string,
    emailRegex,
    emojiRegex,
    uuidRegex,
    nanoidRegex,
    dateRegex,
    timeRegex,
    datetimeRegex,
    ipRegex,
    ipCidrRegex,
};
