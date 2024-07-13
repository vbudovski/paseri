import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.number().finite();
const zodSchema = z.number().finite();
const valitaSchema = v.number().assert((value) => Number.isFinite(value));

const dataValid = 123;
const dataInvalid = Number.NEGATIVE_INFINITY;

bench('Paseri', { group: 'Finite valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Finite valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Finite valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Finite invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Finite invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Finite invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
