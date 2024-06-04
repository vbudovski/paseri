import { bench, describe } from 'vitest';
import { z } from 'zod';
import { NumberSchema } from './number';

describe('Type valid', () => {
	const data = 123;
	const mySchema = new NumberSchema();
	const zodSchema = z.number();

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Type invalid', () => {
	const data = null;
	const mySchema = new NumberSchema();
	const zodSchema = z.number();

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Greater than or equal valid', () => {
	const data = 10;
	const mySchema = new NumberSchema().gte(10);
	const zodSchema = z.number().gte(10);

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Greater than or equal invalid', () => {
	const data = 9;
	const mySchema = new NumberSchema().gte(10);
	const zodSchema = z.number().gte(10);

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Greater than valid', () => {
	const data = 11;
	const mySchema = new NumberSchema().gt(10);
	const zodSchema = z.number().gt(10);

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Greater than invalid', () => {
	const data = 10;
	const mySchema = new NumberSchema().gt(10);
	const zodSchema = z.number().gt(10);

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Less than or equal valid', () => {
	const data = 10;
	const mySchema = new NumberSchema().lte(10);
	const zodSchema = z.number().lte(10);

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Less than or equal invalid', () => {
	const data = 11;
	const mySchema = new NumberSchema().lte(10);
	const zodSchema = z.number().lte(10);

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Less than valid', () => {
	const data = 9;
	const mySchema = new NumberSchema().lt(10);
	const zodSchema = z.number().lt(10);

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Less than invalid', () => {
	const data = 10;
	const mySchema = new NumberSchema().lt(10);
	const zodSchema = z.number().lt(10);

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Integer valid', () => {
	const data = 123;
	const mySchema = new NumberSchema().int();
	const zodSchema = z.number().int();

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Integer invalid', () => {
	const data = 123.4;
	const mySchema = new NumberSchema().int();
	const zodSchema = z.number().int();

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Finite valid', () => {
	const data = 123;
	const mySchema = new NumberSchema().finite();
	const zodSchema = z.number().finite();

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Finite invalid', () => {
	const data = Number.NEGATIVE_INFINITY;
	const mySchema = new NumberSchema().finite();
	const zodSchema = z.number().finite();

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Safe integer valid', () => {
	const data = 123;
	const mySchema = new NumberSchema().safe();
	const zodSchema = z.number().safe();

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});

describe('Safe integer invalid', () => {
	const data = Number.MAX_SAFE_INTEGER + 1;
	const mySchema = new NumberSchema().safe();
	const zodSchema = z.number().safe();

	bench('This', async () => {
		mySchema.safeParse(data);
	});

	bench('Zod', async () => {
		zodSchema.safeParse(data);
	});
});
