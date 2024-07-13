import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.object({
    string1: p.string(),
    string2: p.string(),
    string3: p.string(),
    string4: p.string(),
    string5: p.string(),
    string6: p.string(),
    string7: p.string(),
    string8: p.string(),
    string9: p.string(),
});
const zodSchema = z.object({
    string1: z.string(),
    string2: z.string(),
    string3: z.string(),
    string4: z.string(),
    string5: z.string(),
    string6: z.string(),
    string7: z.string(),
    string8: z.string(),
    string9: z.string(),
});
const valitaSchema = v.object({
    string1: v.string(),
    string2: v.string(),
    string3: v.string(),
    string4: v.string(),
    string5: v.string(),
    string6: v.string(),
    string7: v.string(),
    string8: v.string(),
    string9: v.string(),
});

const data = {
    string1: 'hello',
    string2: 'world',
    string3: 'lorem',
    string4: 'hello',
    string5: 'world',
    string6: 'lorem',
    string7: 'hello',
    string8: 'world',
    string9: 'lorem',
};

bench('Paseri', { group: 'Flat, large' }, () => {
    paseriSchema.safeParse(data);
});

bench('Zod', { group: 'Flat, large' }, () => {
    zodSchema.safeParse(data);
});

bench('Valita', { group: 'Flat, large' }, () => {
    valitaSchema.try(data);
});
