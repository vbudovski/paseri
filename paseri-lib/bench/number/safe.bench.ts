import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.number().safe();
const zodSchema = z.number().safe();
const valitaSchema = v.number().assert((value) => Number.isSafeInteger(value));

const dataValid = 123;
const dataInvalid = Number.MAX_SAFE_INTEGER + 1;

bench('Paseri', { group: 'Safe integer valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Safe integer valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Safe integer valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Safe integer invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Safe integer invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Safe integer invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
