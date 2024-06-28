import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const mySchema = p.null();
const zodSchema = z.null();
const valitaSchema = v.null();

const dataValid = null;
const dataInvalid = undefined;

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
