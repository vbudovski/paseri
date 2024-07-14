import type { TreeNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Component})+$/u;
const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
const nanoidRegex = /^[a-z0-9_-]{21}$/i;

type CheckFunction = (value: string) => TreeNode | undefined;

class StringSchema extends Schema<string> {
    private _checks: CheckFunction[] | undefined = undefined;

    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
        TOO_SHORT: { type: 'leaf', code: 'too_short' },
        TOO_LONG: { type: 'leaf', code: 'too_long' },
        INVALID_EMAIL: { type: 'leaf', code: 'invalid_email' },
        INVALID_EMOJI: { type: 'leaf', code: 'invalid_emoji' },
        INVALID_UUID: { type: 'leaf', code: 'invalid_uuid' },
        INVALID_NANOID: { type: 'leaf', code: 'invalid_nanoid' },
    } as const;

    protected _clone() {
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
    min(length: number) {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value.length < length) {
                return this.issues.TOO_SHORT;
            }
        });

        return cloned;
    }
    max(length: number) {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (_value.length > length) {
                return this.issues.TOO_LONG;
            }
        });

        return cloned;
    }
    length(length: number) {
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
    email() {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!emailRegex.test(_value)) {
                return this.issues.INVALID_EMAIL;
            }
        });

        return cloned;
    }
    emoji() {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!emojiRegex.test(_value)) {
                return this.issues.INVALID_EMOJI;
            }
        });

        return cloned;
    }
    uuid() {
        const cloned = this._clone();
        cloned._checks = this._checks || [];
        cloned._checks.push((_value) => {
            if (!uuidRegex.test(_value)) {
                return this.issues.INVALID_UUID;
            }
        });

        return cloned;
    }
    nanoid() {
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

function string() {
    return singleton;
}

export { string };
