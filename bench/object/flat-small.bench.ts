import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.object({
    string1: p.string(),
    string2: p.string(),
    string3: p.string(),
});
const zodSchema = z.object({
    string1: z.string(),
    string2: z.string(),
    string3: z.string(),
});
const valitaSchema = v.object({
    string1: v.string(),
    string2: v.string(),
    string3: v.string(),
});

const data = {
    string1: 'hello',
    string2: 'world',
    string3: 'lorem',
};

bench('Paseri', { group: 'Flat, small' }, () => {
    paseriSchema.safeParse(data);
});

bench('Zod', { group: 'Flat, small' }, () => {
    zodSchema.safeParse(data);
});

bench('Valita', { group: 'Flat, small' }, () => {
    valitaSchema.try(data);
});
