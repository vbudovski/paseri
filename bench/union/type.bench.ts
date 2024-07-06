import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.union(p.string(), p.number(), p.boolean());
const zodSchema = z.union([z.string(), z.number(), z.boolean()]);
const valitaSchema = v.union(v.string(), v.number(), v.boolean());

const dataValid = 'Hello, world!';
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
