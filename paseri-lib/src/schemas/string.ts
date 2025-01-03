import { type LeafNode, type TreeNode, issueCodes } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

// These regular expressions should match Zod, wherever possible.
const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
const emojiRegex = /^(?:(?=(\p{Extended_Pictographic}|\p{Emoji_Component}))\1)+$/u;
const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
const nanoidRegex = /^[a-z0-9_-]{21}$/i;
// Does not support negative years, or years above 9999.
const dateRegexString =
    '((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))';
const dateRegex = new RegExp(`^${dateRegexString}$`);
const timeRegexString = (precision?: number) =>
    `([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d${precision === undefined ? '(\\.\\d+)?' : `\\.\\d{${precision}}`}`;
const timeRegex = (precision?: number) => new RegExp(`^${timeRegexString(precision)}$`);
const datetimeRegex = (precision?: number, offset?: boolean, local?: boolean) => {
    const timezone: string[] = [];
    timezone.push(local ? 'Z?' : 'Z');
    if (offset) {
        timezone.push('([+-][0-5]\\d:[0-5]\\d)');
    }

    return new RegExp(`^${dateRegexString}T${timeRegexString(precision)}${timezone.join('|')}$`);
};
const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
// Does not support dual format IPv4/IPv6 addresses "y:y:y:y:y:y:x.x.x.x".
const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9]))$/;
const ipv4CidrRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
const ipv6CidrRegex =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;

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
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!emailRegex.test(_value)) {
                return this.issues.INVALID_EMAIL;
            }
        });

        return cloned;
    }
    emoji(): StringSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!emojiRegex.test(_value)) {
                return this.issues.INVALID_EMOJI;
            }
        });

        return cloned;
    }
    uuid(): StringSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!uuidRegex.test(_value)) {
                return this.issues.INVALID_UUID;
            }
        });

        return cloned;
    }
    nanoid(): StringSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!nanoidRegex.test(_value)) {
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
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!dateRegex.test(_value)) {
                return this.issues.INVALID_DATE_STRING;
            }
        });

        return cloned;
    }
    time(options: { precision?: number } = {}): StringSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!timeRegex(options.precision).test(_value)) {
                return this.issues.INVALID_TIME_STRING;
            }
        });

        return cloned;
    }
    datetime(options: { precision?: number; offset?: boolean; local?: boolean } = {}): StringSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!datetimeRegex(options.precision, options.offset, options.local).test(_value)) {
                return this.issues.INVALID_DATE_TIME_STRING;
            }
        });

        return cloned;
    }
    ip(options: { version?: 4 | 6 } = {}): StringSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!options.version) {
                if (!ipv4Regex.test(_value) && !ipv6Regex.test(_value)) {
                    return this.issues.INVALID_IP_ADDRESS;
                }
            } else if (options.version === 4) {
                if (!ipv4Regex.test(_value)) {
                    return this.issues.INVALID_IP_ADDRESS;
                }
            } else {
                if (!ipv6Regex.test(_value)) {
                    return this.issues.INVALID_IP_ADDRESS;
                }
            }
        });

        return cloned;
    }
    cidr(options: { version?: 4 | 6 } = {}): StringSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!options.version) {
                if (!ipv4CidrRegex.test(_value) && !ipv6CidrRegex.test(_value)) {
                    return this.issues.INVALID_IP_ADDRESS_RANGE;
                }
            } else if (options.version === 4) {
                if (!ipv4CidrRegex.test(_value)) {
                    return this.issues.INVALID_IP_ADDRESS_RANGE;
                }
            } else {
                if (!ipv6CidrRegex.test(_value)) {
                    return this.issues.INVALID_IP_ADDRESS_RANGE;
                }
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
    ipv4Regex,
    ipv6Regex,
    ipv4CidrRegex,
    ipv6CidrRegex,
};
