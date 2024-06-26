import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const mySchema = p.string().uuid();
const zodSchema = z.string().uuid();

const dataValid = 'd98d4b7e-58a5-4e21-839b-2699b94c115b';
const dataInvalid = 'not_a_UUID';

bench('This', { group: 'UUID valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'UUID valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('This', { group: 'UUID invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'UUID invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
