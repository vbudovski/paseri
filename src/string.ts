import { type ParseResult, Schema } from './schema.ts';

const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Component})+$/u;
const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
const nanoidRegex = /^[a-z0-9_-]{21}$/i;

class StringSchema extends Schema<string> {
    _parse(value: unknown): ParseResult<string> {
        if (typeof value !== 'string') {
            return { ok: false, issue: { type: 'leaf', code: 'invalid_type' } };
        }
        for (const check of this.checks) {
            const issue = check(value);
            if (issue) {
                return { ok: false, issue };
            }
        }

        return { ok: true, value: value as string };
    }
    min(length: number) {
        this.checks.push((_value) => {
            if (_value.length < length) {
                return { type: 'leaf', code: 'too_short' };
            }

            return undefined;
        });

        return this;
    }
    max(length: number) {
        this.checks.push((_value) => {
            if (_value.length > length) {
                return { type: 'leaf', code: 'too_long' };
            }

            return undefined;
        });

        return this;
    }
    length(length: number) {
        this.checks.push((_value) => {
            if (_value.length > length) {
                return { type: 'leaf', code: 'too_long' };
            }
            if (_value.length < length) {
                return { type: 'leaf', code: 'too_short' };
            }

            return undefined;
        });

        return this;
    }
    email() {
        this.checks.push((_value) => {
            if (!emailRegex.test(_value)) {
                return { type: 'leaf', code: 'invalid_email' };
            }

            return undefined;
        });

        return this;
    }
    emoji() {
        this.checks.push((_value) => {
            if (!emojiRegex.test(_value)) {
                return { type: 'leaf', code: 'invalid_emoji' };
            }

            return undefined;
        });

        return this;
    }
    uuid() {
        this.checks.push((_value) => {
            if (!uuidRegex.test(_value)) {
                return { type: 'leaf', code: 'invalid_uuid' };
            }

            return undefined;
        });

        return this;
    }
    nanoid() {
        this.checks.push((_value) => {
            if (!nanoidRegex.test(_value)) {
                return { type: 'leaf', code: 'invalid_nanoid' };
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
