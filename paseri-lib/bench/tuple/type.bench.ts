import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.tuple(p.number(), p.string(), p.literal(123n));
const zodSchema = z.tuple([z.number(), z.string(), z.literal(123n)]);
const valitaSchema = v.tuple([v.number(), v.string(), v.literal(123n)]);

const dataValid = [1, 'foo', 123n];
const dataInvalid = null;

bench('Paseri', { group: 'Type valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Type valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Type valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Type invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Type invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Type invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
