import { type LeafNode, type TreeNode, issueCodes } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
const emojiRegex = /^(?:(?=(\p{Extended_Pictographic}|\p{Emoji_Component}))\1)+$/u;
const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
const nanoidRegex = /^[a-z0-9_-]{21}$/i;

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
}

const singleton = /* @__PURE__ */ new StringSchema();

/**
 * [String](https://paseri.dev/reference/schema/primitives/string/) schema.
 */
const string = /* @__PURE__ */ (): StringSchema => singleton;

export { string, emailRegex, emojiRegex, uuidRegex, nanoidRegex };
