import { type InternalParseResult, Schema } from './schema.ts';

const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Component})+$/u;
const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
const nanoidRegex = /^[a-z0-9_-]{21}$/i;

class StringSchema extends Schema<string> {
    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
        TOO_SHORT: { type: 'leaf', code: 'too_short' },
        TOO_LONG: { type: 'leaf', code: 'too_long' },
        INVALID_EMAIL: { type: 'leaf', code: 'invalid_email' },
        INVALID_EMOJI: { type: 'leaf', code: 'invalid_emoji' },
        INVALID_UUID: { type: 'leaf', code: 'invalid_uuid' },
        INVALID_NANOID: { type: 'leaf', code: 'invalid_nanoid' },
    } as const;

    _parse(value: unknown): InternalParseResult<string> {
        if (typeof value !== 'string') {
            return this.issues.INVALID_TYPE;
        }

        if (this.checks !== undefined) {
            const length = this.checks.length;
            for (let i = 0; i < length; i++) {
                const check = this.checks[i];
                const issue = check(value);
                if (issue) {
                    return issue;
                }
            }
        }

        return undefined;
    }
    min(length: number) {
        this.addCheck((_value) => {
            if (_value.length < length) {
                return this.issues.TOO_SHORT;
            }

            return undefined;
        });

        return this;
    }
    max(length: number) {
        this.addCheck((_value) => {
            if (_value.length > length) {
                return this.issues.TOO_LONG;
            }

            return undefined;
        });

        return this;
    }
    length(length: number) {
        this.addCheck((_value) => {
            if (_value.length > length) {
                return this.issues.TOO_LONG;
            }
            if (_value.length < length) {
                return this.issues.TOO_SHORT;
            }

            return undefined;
        });

        return this;
    }
    email() {
        this.addCheck((_value) => {
            if (!emailRegex.test(_value)) {
                return this.issues.INVALID_EMAIL;
            }

            return undefined;
        });

        return this;
    }
    emoji() {
        this.addCheck((_value) => {
            if (!emojiRegex.test(_value)) {
                return this.issues.INVALID_EMOJI;
            }

            return undefined;
        });

        return this;
    }
    uuid() {
        this.addCheck((_value) => {
            if (!uuidRegex.test(_value)) {
                return this.issues.INVALID_UUID;
            }

            return undefined;
        });

        return this;
    }
    nanoid() {
        this.addCheck((_value) => {
            if (!nanoidRegex.test(_value)) {
                return this.issues.INVALID_NANOID;
            }

            return undefined;
        });

        return this;
    }
}

function string() {
    return new StringSchema();
}

export { string };
