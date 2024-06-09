import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import { NumberSchema } from '../../src/number.ts';

const { bench } = Deno;

const mySchema = new NumberSchema().lte(10);
const zodSchema = z.number().lte(10);
const valitaSchema = v.number().assert((value) => value <= 10);

const dataValid = 10;
const dataInvalid = 11;

bench('This', { group: 'Less than or equal valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Less than or equal valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Less than or equal valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Less than or equal invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Less than or equal invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Less than or equal invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
