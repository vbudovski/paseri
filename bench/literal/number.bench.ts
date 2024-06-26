import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import * as s from '../../src/index.ts';

const { bench } = Deno;

const mySchema = s.literal(123);
const zodSchema = z.literal(123);
const valitaSchema = v.literal(123);

const dataValid = 123;
const dataInvalid = 456;

bench('This', { group: 'Number valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Number valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Number valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Number invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Number invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Number invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
