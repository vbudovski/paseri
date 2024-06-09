import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import { NumberSchema } from '../../src/number.ts';

const { bench } = Deno;

const mySchema = new NumberSchema().gt(10);
const zodSchema = z.number().gt(10);
const valitaSchema = v.number().assert((value) => value > 10);

const dataValid = 11;
const dataInvalid = 10;

bench('This', { group: 'Greater than valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Greater than valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Greater than valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Greater than invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Greater than invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Greater than invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
