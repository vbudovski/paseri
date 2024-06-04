import { bench, describe } from 'vitest';
import { z } from 'zod';
import { BooleanSchema } from './boolean';

describe('Type valid', () => {
	const data = true;
	const mySchema = new BooleanSchema();
	const zodSchema = z.boolean();

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Type invalid', () => {
	const data = null;
	const mySchema = new BooleanSchema();
	const zodSchema = z.boolean();

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});
