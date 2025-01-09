import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.literal(true);
const zodSchema = z.literal(true);
const valitaSchema = v.literal(true);

const dataValid = true;
const dataInvalid = false;

bench('Paseri', { group: 'Boolean valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Boolean valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Boolean valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Boolean invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Boolean invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Boolean invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
