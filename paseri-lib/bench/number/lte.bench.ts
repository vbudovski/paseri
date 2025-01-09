import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.number().lte(10);
const zodSchema = z.number().lte(10);
const valitaSchema = v.number().assert((value) => value <= 10);

const dataValid = 10;
const dataInvalid = 11;

bench('Paseri', { group: 'Less than or equal valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Less than or equal valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Less than or equal valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Less than or equal invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Less than or equal invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Less than or equal invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
