import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.number().lt(10);
const zodSchema = z.number().lt(10);
const valitaSchema = v.number().assert((value) => value < 10);

const dataValid = 9;
const dataInvalid = 10;

bench('Paseri', { group: 'Less than valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Less than valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Less than valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Less than invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Less than invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Less than invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
