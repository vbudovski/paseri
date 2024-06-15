import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import * as s from '../../src/index.ts';

const { bench } = Deno;

const mySchema = s.object({
    string1: s.string(),
    string2: s.string(),
    string3: s.string(),
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

bench('This', { group: 'Flat, small' }, () => {
    mySchema.safeParse(data);
});

bench('Zod', { group: 'Flat, small' }, () => {
    zodSchema.safeParse(data);
});

bench('Valita', { group: 'Flat, small' }, () => {
    valitaSchema.try(data);
});
