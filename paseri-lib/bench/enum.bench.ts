import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.enum('red', 'green', 'blue');
const zodSchema = z.enum(['red', 'green', 'blue']);
const valitaSchema = v.union(v.literal('red'), v.literal('green'), v.literal('blue'));

const dataValid = 'red';
const dataInvalid = 'purple';

bench('Paseri', { group: 'Type valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Type valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Type valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Type invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Type invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Type invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
