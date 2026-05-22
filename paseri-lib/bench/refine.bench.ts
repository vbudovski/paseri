import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().refine((value) => value.length > 0, { code: 'must_be_non_empty' });
const zodSchema = z.string().refine((value) => value.length > 0, { message: 'must_be_non_empty' });
const valitaSchema = v.string().assert((value) => value.length > 0);

const dataValid = 'hello';
const dataInvalid = '';

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
