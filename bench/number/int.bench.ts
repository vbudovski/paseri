import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import { NumberSchema } from '../../src/number.ts';

const { bench } = Deno;

const mySchema = new NumberSchema().int();
const zodSchema = z.number().int();
const valitaSchema = v.number().assert((value) => Number.isInteger(value));

const dataValid = 123;
const dataInvalid = 123.4;

bench('This', { group: 'Integer valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Integer valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Integer valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Integer invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Integer invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Integer invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
