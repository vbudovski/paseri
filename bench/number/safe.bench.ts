import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import * as s from '../../src/index.ts';

const { bench } = Deno;

const mySchema = s.number().safe();
const zodSchema = z.number().safe();
const valitaSchema = v.number().assert((value) => Number.isSafeInteger(value));

const dataValid = 123;
const dataInvalid = Number.MAX_SAFE_INTEGER + 1;

bench('This', { group: 'Safe integer valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Safe integer valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Safe integer valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Safe integer invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Safe integer invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Safe integer invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
