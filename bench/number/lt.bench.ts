import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import * as s from '../../src/index.ts';

const { bench } = Deno;

const mySchema = s.number().lt(10);
const zodSchema = z.number().lt(10);
const valitaSchema = v.number().assert((value) => value < 10);

const dataValid = 9;
const dataInvalid = 10;

bench('This', { group: 'Less than valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Less than valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Less than valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Less than invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Less than invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Less than invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
