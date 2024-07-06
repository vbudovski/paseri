import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().max(3);
const zodSchema = z.string().max(3);
const valitaSchema = v.string().assert((value) => value.length <= 3);

const dataValid = 'aaa';
const dataInvalid = 'aaaa';

bench('Paseri', { group: 'Max valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Max valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Max valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Max invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Max invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Max invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
