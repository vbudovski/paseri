import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.literal(123);
const zodSchema = z.literal(123);
const valitaSchema = v.literal(123);

const dataValid = 123;
const dataInvalid = 456;

bench('Paseri', { group: 'Number valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Number valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Number valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Number invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Number invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Number invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
