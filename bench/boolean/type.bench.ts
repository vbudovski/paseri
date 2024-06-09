import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import { BooleanSchema } from '../../src/boolean.ts';

const { bench } = Deno;

const mySchema = new BooleanSchema();
const zodSchema = z.boolean();
const valitaSchema = v.boolean();

const dataValid = true;
const dataInvalid = null;

bench('This', { group: 'Type valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Type valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Type valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Type invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Type invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Type invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
