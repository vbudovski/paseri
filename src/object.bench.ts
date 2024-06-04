import { bench, describe } from 'vitest';
import { z } from 'zod';
import { ObjectSchema } from './object';
import { StringSchema } from './string';

describe('Type valid', () => {
	const data = {
		string1: 'hello',
		object1: { string2: 'world' },
		object2: { object3: { string3: 'abc' } },
	};
	const mySchema = new ObjectSchema({
		string1: new StringSchema(),
		object1: new ObjectSchema({ string2: new StringSchema() }),
		object2: new ObjectSchema({ object3: new ObjectSchema({ string3: new StringSchema() }) }),
	});
	const zodSchema = z.object({
		string1: z.string(),
		object1: z.object({ string2: z.string() }),
		object2: z.object({ object3: z.object({ string3: z.string() }) }),
	});

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Type invalid', () => {
	const data = null;
	const mySchema = new ObjectSchema({
		foo: new StringSchema(),
	});
	const zodSchema = z.object({
		foo: z.string(),
	});

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});
