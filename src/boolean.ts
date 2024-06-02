import { type ParseResult, Schema } from './schema';

class BooleanSchema extends Schema<boolean> {
	override parse(value: unknown): ParseResult<boolean> {
		if (typeof value !== 'boolean') {
			return { status: 'error', errors: ['Not a boolean.'] };
		}

		return super.parse(value);
	}
}

export { BooleanSchema };
