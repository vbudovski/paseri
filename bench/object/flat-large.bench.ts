import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import * as s from '../../src/index.ts';

const { bench } = Deno;

const mySchema = s.object({
    string1: s.string(),
    string2: s.string(),
    string3: s.string(),
    string4: s.string(),
    string5: s.string(),
    string6: s.string(),
    string7: s.string(),
    string8: s.string(),
    string9: s.string(),
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

bench('This', { group: 'Flat, large' }, () => {
    mySchema.safeParse(data);
});

bench('Zod', { group: 'Flat, large' }, () => {
    zodSchema.safeParse(data);
});

bench('Valita', { group: 'Flat, large' }, () => {
    valitaSchema.try(data);
});
