import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().uuid();
const zodSchema = z.string().uuid();

const dataValid = 'd98d4b7e-58a5-4e21-839b-2699b94c115b';
const dataInvalid = 'not_a_UUID';

bench('Paseri', { group: 'UUID valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'UUID valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'UUID invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'UUID invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
