import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const mySchema = p.number().gte(10);
const zodSchema = z.number().gte(10);
const valitaSchema = v.number().assert((value) => value >= 10);

const dataValid = 10;
const dataInvalid = 9;

bench('This', { group: 'Greater than or equal valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Greater than or equal valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Greater than or equal valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Greater than or equal invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Greater than or equal invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Greater than or equal invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
