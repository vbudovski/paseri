import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.number().gt(10);
const zodSchema = z.number().gt(10);
const valitaSchema = v.number().assert((value) => value > 10);

const dataValid = 11;
const dataInvalid = 10;

bench('Paseri', { group: 'Greater than valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Greater than valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Greater than valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Greater than invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Greater than invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Greater than invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
