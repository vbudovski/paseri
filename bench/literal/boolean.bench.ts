import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const mySchema = p.literal(true);
const zodSchema = z.literal(true);
const valitaSchema = v.literal(true);

const dataValid = true;
const dataInvalid = false;

bench('This', { group: 'Boolean valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Boolean valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Boolean valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Boolean invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Boolean invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Boolean invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
