import { bench, describe } from 'vitest';
import { z } from 'zod';
import { BooleanSchema } from './boolean';
import { NumberSchema } from './number';
import { ObjectSchema } from './object';
import { StringSchema } from './string';

const data = Object.freeze({
	number: 1,
	negNumber: -1,
	maxNumber: Number.MAX_VALUE,
	string: 'string',
	longString:
		'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
	boolean: true,
	deeplyNested: {
		foo: 'bar',
		num: 1,
		bool: false,
	},
});
const mySchemaStrict = new ObjectSchema({
	number: new NumberSchema(),
	negNumber: new NumberSchema(),
	maxNumber: new NumberSchema(),
	string: new StringSchema(),
	longString: new StringSchema(),
	boolean: new BooleanSchema(),
	deeplyNested: new ObjectSchema({
		foo: new StringSchema(),
		num: new NumberSchema(),
		bool: new BooleanSchema(),
	}).strict(),
}).strict();
const zodSchemaStrict = z
	.object({
		number: z.number(),
		negNumber: z.number(),
		maxNumber: z.number(),
		string: z.string(),
		longString: z.string(),
		boolean: z.boolean(),
		deeplyNested: z
			.object({
				foo: z.string(),
				num: z.number(),
				bool: z.boolean(),
			})
			.strict(),
	})
	.strict();

describe('Parse strict', () => {
	bench('This', () => {
		mySchemaStrict.safeParse(data);
	});

	bench('Zod', () => {
		zodSchemaStrict.safeParse(data);
	});
});
