import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import { StringSchema } from '../../src/string.ts';

const { bench } = Deno;

const mySchema = new StringSchema();
const zodSchema = z.string();
const valitaSchema = v.string();

const dataValid = 'Hello, world!';
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
