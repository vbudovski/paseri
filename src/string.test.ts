import { describe, expect, test } from 'vitest';
import type { ParseErrorResult, ParseSuccessResult } from './schema';
import { StringSchema } from './string';

describe('Type', () => {
	const schema = new StringSchema();

	test('Valid', async () => {
		const result = schema.safeParse('Hello, world!');
		expect(result.status).toBe('success');
		const success = result as ParseSuccessResult<string>;
		expect(success.value).toBe('Hello, world!');
	});

	test('Not a string', async () => {
		const result = schema.safeParse(null);
		expect(result.status).toBe('error');
		const error = result as ParseErrorResult;
		expect(error.errors).toEqual([{ path: [], message: 'Not a string.' }]);
	});
});

describe('Min', () => {
	const schema = new StringSchema().min(3);

	test('Valid', async () => {
		const result = schema.safeParse('aaa');
		expect(result.status).toBe('success');
		const success = result as ParseSuccessResult<string>;
		expect(success.value).toBe('aaa');
	});

	test('Too short', async () => {
		const result = schema.safeParse('aa');
		expect(result.status).toBe('error');
		const error = result as ParseErrorResult;
		expect(error.errors).toEqual([{ path: [], message: 'Too short.' }]);
	});
});

describe('Max', () => {
	const schema = new StringSchema().max(3);

	test('Valid', async () => {
		const result = schema.safeParse('aaa');
		expect(result.status).toBe('success');
		const success = result as ParseSuccessResult<string>;
		expect(success.value).toBe('aaa');
	});

	test('Too long', async () => {
		const result = schema.safeParse('aaaa');
		expect(result.status).toBe('error');
		const error = result as ParseErrorResult;
		expect(error.errors).toEqual([{ path: [], message: 'Too long.' }]);
	});
});

describe('Length', () => {
	const schema = new StringSchema().length(3);

	test('Valid', async () => {
		const result = schema.safeParse('aaa');
		expect(result.status).toBe('success');
		const success = result as ParseSuccessResult<string>;
		expect(success.value).toBe('aaa');
	});

	test('Too long', async () => {
		const result = schema.safeParse('aaaa');
		expect(result.status).toBe('error');
		const error = result as ParseErrorResult;
		expect(error.errors).toEqual([{ path: [], message: 'Too long.' }]);
	});

	test('Too short', async () => {
		const result = schema.safeParse('aa');
		expect(result.status).toBe('error');
		const error = result as ParseErrorResult;
		expect(error.errors).toEqual([{ path: [], message: 'Too short.' }]);
	});
});

describe('Email', () => {
	const schema = new StringSchema().email();

	test('Valid', async () => {
		const result = schema.safeParse('hello@example.com');
		expect(result.status).toBe('success');
		const success = result as ParseSuccessResult<string>;
		expect(success.value).toBe('hello@example.com');
	});

	test('Invalid', async () => {
		const result = schema.safeParse('not_an_email');
		expect(result.status).toBe('error');
		const error = result as ParseErrorResult;
		expect(error.errors).toEqual([{ path: [], message: 'Not an email.' }]);
	});
});

describe('Emoji', () => {
	const schema = new StringSchema().emoji();

	test('Valid', async () => {
		const result = schema.safeParse('🥳');
		expect(result.status).toBe('success');
		const success = result as ParseSuccessResult<string>;
		expect(success.value).toBe('🥳');
	});

	test('Invalid', async () => {
		const result = schema.safeParse('a');
		expect(result.status).toBe('error');
		const error = result as ParseErrorResult;
		expect(error.errors).toEqual([{ path: [], message: 'Not an emoji.' }]);
	});
});

describe('UUID', () => {
	const schema = new StringSchema().uuid();

	test('Valid', async () => {
		const result = schema.safeParse('d98d4b7e-58a5-4e21-839b-2699b94c115b');
		expect(result.status).toBe('success');
		const success = result as ParseSuccessResult<string>;
		expect(success.value).toBe('d98d4b7e-58a5-4e21-839b-2699b94c115b');
	});

	test('Invalid', async () => {
		const result = schema.safeParse('not_a_uuid');
		expect(result.status).toBe('error');
		const error = result as ParseErrorResult;
		expect(error.errors).toEqual([{ path: [], message: 'Not a UUID.' }]);
	});
});

describe('Nano ID', () => {
	const schema = new StringSchema().nanoid();

	test('Valid', async () => {
		const result = schema.safeParse('V1StGXR8_Z5jdHi6B-myT');
		expect(result.status).toBe('success');
		const success = result as ParseSuccessResult<string>;
		expect(success.value).toBe('V1StGXR8_Z5jdHi6B-myT');
	});

	test('Invalid', async () => {
		const result = schema.safeParse('not_a_nano_id');
		expect(result.status).toBe('error');
		const error = result as ParseErrorResult;
		expect(error.errors).toEqual([{ path: [], message: 'Not a Nano ID.' }]);
	});
});
