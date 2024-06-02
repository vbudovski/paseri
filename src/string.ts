import { type ParseResult, Schema } from './schema';

interface CheckSuccessResult {
	status: 'success';
}

interface CheckErrorResult {
	status: 'error';
	message: string;
}

type CheckResult = CheckSuccessResult | CheckErrorResult;

const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Component})+$/u;
const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
const nanoidRegex = /^[a-z0-9_-]{21}$/i;

class StringSchema extends Schema<string> {
	override parse(value: unknown): ParseResult<string> {
		if (typeof value !== 'string') {
			return { status: 'error', errors: ['Not a string.'] };
		}

		return super.parse(value);
	}
	min(length: number) {
		function check(value: string): CheckResult {
			if (value.length < length) {
				return { status: 'error', message: 'Too short.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	max(length: number) {
		function check(value: string): CheckResult {
			if (value.length > length) {
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
		function check(value: string): CheckResult {
			if (!emailRegex.test(value)) {
				return { status: 'error', message: 'Not an email.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	emoji() {
		function check(value: string): CheckResult {
			if (!emojiRegex.test(value)) {
				return { status: 'error', message: 'Not an emoji.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	uuid() {
		function check(value: string): CheckResult {
			if (!uuidRegex.test(value)) {
				return { status: 'error', message: 'Not a UUID.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	nanoid() {
		function check(value: string): CheckResult {
			if (!nanoidRegex.test(value)) {
				return { status: 'error', message: 'Not a Nano ID.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
}

export { StringSchema };
