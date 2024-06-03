import { type CheckResult, Schema, type ValidationError } from './schema';

const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Component})+$/u;
const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
const nanoidRegex = /^[a-z0-9_-]{21}$/i;

class StringSchema extends Schema<string> {
	override _parse(value: unknown): ValidationError[] {
		if (typeof value !== 'string') {
			return [{ path: [], message: 'Not a string.' }];
		}

		return super._parse(value);
	}

	min(length: number) {
		function check(_value: string): CheckResult {
			if (_value.length < length) {
				return { status: 'error', message: 'Too short.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	max(length: number) {
		function check(_value: string): CheckResult {
			if (_value.length > length) {
				return { status: 'error', message: 'Too long.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	length(length: number) {
		this.max(length);
		this.min(length);

		return this;
	}
	email() {
		function check(_value: string): CheckResult {
			if (!emailRegex.test(_value)) {
				return { status: 'error', message: 'Not an email.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	emoji() {
		function check(_value: string): CheckResult {
			if (!emojiRegex.test(_value)) {
				return { status: 'error', message: 'Not an emoji.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	uuid() {
		function check(_value: string): CheckResult {
			if (!uuidRegex.test(_value)) {
				return { status: 'error', message: 'Not a UUID.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	nanoid() {
		function check(_value: string): CheckResult {
			if (!nanoidRegex.test(_value)) {
				return { status: 'error', message: 'Not a Nano ID.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
}

export { StringSchema };
