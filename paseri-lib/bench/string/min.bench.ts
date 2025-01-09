import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().min(3);
const zodSchema = z.string().min(3);
const valitaSchema = v.string().assert((value) => value.length >= 3);

const dataValid = 'aaa';
const dataInvalid = 'aa';

bench('Paseri', { group: 'Min valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Min valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Min valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Min invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Min invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Min invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
