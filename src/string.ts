import { type ParseResult, Schema, type ValidationError } from './schema.ts';

const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Component})+$/u;
const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
const nanoidRegex = /^[a-z0-9_-]{21}$/i;

class StringSchema extends Schema<string> {
    private readonly issues: Record<string, [ValidationError]> = {
        INVALID_TYPE: [{ path: [], message: 'Not a string.' }],
        TOO_SHORT: [{ path: [], message: 'Too short.' }],
        TOO_LONG: [{ path: [], message: 'Too long.' }],
        INVALID_EMAIL: [{ path: [], message: 'Not an email.' }],
        INVALID_EMOJI: [{ path: [], message: 'Not an emoji.' }],
        INVALID_UUID: [{ path: [], message: 'Not a UUID.' }],
        INVALID_NANOID: [{ path: [], message: 'Not a Nano ID.' }],
    };

    _parse(value: unknown): ParseResult<string> {
        if (typeof value !== 'string') {
            return { ok: false, errors: this.issues.INVALID_TYPE };
        }
        for (const check of this.checks) {
            const result = check(value);
            if (result) {
                return result;
            }
        }

        return { ok: true, value: value as string };
    }
    min(length: number) {
        this.checks.push((_value) => {
            if (_value.length < length) {
                return { ok: false, errors: this.issues.TOO_SHORT };
            }

            return undefined;
        });

        return this;
    }
    max(length: number) {
        this.checks.push((_value) => {
            if (_value.length > length) {
                return { ok: false, errors: this.issues.TOO_LONG };
            }

            return undefined;
        });

        return this;
    }
    length(length: number) {
        this.checks.push((_value) => {
            if (_value.length > length) {
                return { ok: false, errors: this.issues.TOO_LONG };
            }
            if (_value.length < length) {
                return { ok: false, errors: this.issues.TOO_SHORT };
            }

            return undefined;
        });

        return this;
    }
    email() {
        this.checks.push((_value) => {
            if (!emailRegex.test(_value)) {
                return { ok: false, errors: this.issues.INVALID_EMAIL };
            }

            return undefined;
        });

        return this;
    }
    emoji() {
        this.checks.push((_value) => {
            if (!emojiRegex.test(_value)) {
                return { ok: false, errors: this.issues.INVALID_EMOJI };
            }

            return undefined;
        });

        return this;
    }
    uuid() {
        this.checks.push((_value) => {
            if (!uuidRegex.test(_value)) {
                return { ok: false, errors: this.issues.INVALID_UUID };
            }

            return undefined;
        });

        return this;
    }
    nanoid() {
        this.checks.push((_value) => {
            if (!nanoidRegex.test(_value)) {
                return { ok: false, errors: this.issues.INVALID_NANOID };
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
