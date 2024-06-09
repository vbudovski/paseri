import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import { NumberSchema } from '../../src/number.ts';

const { bench } = Deno;

const mySchema = new NumberSchema().finite();
const zodSchema = z.number().finite();
const valitaSchema = v.number().assert((value) => Number.isFinite(value));

const dataValid = 123;
const dataInvalid = Number.NEGATIVE_INFINITY;

bench('This', { group: 'Finite valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Finite valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Finite valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Finite invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Finite invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Finite invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
