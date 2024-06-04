import { describe, expect, test } from 'vitest';
import { BooleanSchema } from './boolean';
import type { ParseErrorResult, ParseSuccessResult } from './schema';

describe('Type', () => {
	const schema = new BooleanSchema();

	test('Valid', async () => {
		const result = schema.safeParse(true);
		expect(result.status).toBe('success');
		const success = result as ParseSuccessResult<boolean>;
		expect(success.value).toBe(true);
	});

	test('Not a number', async () => {
		const result = schema.safeParse(null);
		expect(result.status).toBe('error');
		const error = result as ParseErrorResult;
		expect(error.errors).toEqual([{ path: [], message: 'Not a boolean.' }]);
	});
});
