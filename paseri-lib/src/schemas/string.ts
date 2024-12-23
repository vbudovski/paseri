import { type LeafNode, type TreeNode, issueCodes } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Component})+$/u;
const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
const nanoidRegex = /^[a-z0-9_-]{21}$/i;

type CheckFunction = (value: string) => TreeNode | undefined;

class StringSchema extends Schema<string> {
    private _checks: CheckFunction[] | undefined = undefined;

    readonly issues: Record<string, LeafNode> = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'string' },
        TOO_SHORT: { type: 'leaf', code: issueCodes.TOO_SHORT },
        TOO_LONG: { type: 'leaf', code: issueCodes.TOO_LONG },
        INVALID_EMAIL: { type: 'leaf', code: issueCodes.INVALID_EMAIL },
        INVALID_EMOJI: { type: 'leaf', code: issueCodes.INVALID_EMOJI },
        INVALID_UUID: { type: 'leaf', code: issueCodes.INVALID_UUID },
        INVALID_NANOID: { type: 'leaf', code: issueCodes.INVALID_NANOID },
    } as const;

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
}

const singleton = new StringSchema();

function string(): StringSchema {
    return singleton;
}

export { string, emailRegex, emojiRegex, uuidRegex, nanoidRegex };
