import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.literal('apple');
const zodSchema = z.literal('apple');
const valitaSchema = v.literal('apple');

const dataValid = 'apple';
const dataInvalid = 'banana';

bench('Paseri', { group: 'String valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'String valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'String valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'String invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'String invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'String invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
