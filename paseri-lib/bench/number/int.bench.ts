import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.number().int();
const zodSchema = z.number().int();
const valitaSchema = v.number().assert((value) => Number.isInteger(value));

const dataValid = 123;
const dataInvalid = 123.4;

bench('Paseri', { group: 'Integer valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Integer valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Integer valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Integer invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Integer invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Integer invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
