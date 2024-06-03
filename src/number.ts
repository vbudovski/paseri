import { type CheckResult, Schema, type ValidationError } from './schema';

class NumberSchema extends Schema<number> {
	override _parse(value: unknown): ValidationError[] {
		if (typeof value !== 'number') {
			return [{ path: [], message: 'Not a number.' }];
		}

		return super._parse(value);
	}
	gte(value: number) {
		function check(_value: number): CheckResult {
			if (_value < value) {
				return { status: 'error', message: 'Too small.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	gt(value: number) {
		function check(_value: number): CheckResult {
			if (_value <= value) {
				return { status: 'error', message: 'Too small.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	lte(value: number) {
		function check(_value: number): CheckResult {
			if (_value > value) {
				return { status: 'error', message: 'Too large.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	lt(value: number) {
		function check(_value: number): CheckResult {
			if (_value >= value) {
				return { status: 'error', message: 'Too large.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	int() {
		function check(_value: number): CheckResult {
			if (!Number.isInteger(_value)) {
				return { status: 'error', message: 'Not an integer.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	finite() {
		function check(_value: number): CheckResult {
			if (!Number.isFinite(_value)) {
				return { status: 'error', message: 'Not finite.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
	safe() {
		function check(_value: number): CheckResult {
			if (!Number.isSafeInteger(_value)) {
				return { status: 'error', message: 'Not safe integer.' };
			}

			return { status: 'success' };
		}

		this.checks.push(check);

		return this;
	}
}

export { NumberSchema };
