import { issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
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
} from './regex.gen.ts';
import { Schema } from './schema.ts';

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
        DOES_NOT_MATCH_REGEX: { type: 'leaf', code: issueCodes.DOES_NOT_MATCH_REGEX },
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
    regex(regex: RegExp): StringSchema {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!regex.test(_value)) {
                return this.issues.DOES_NOT_MATCH_REGEX;
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
