import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const mySchema = p.object({
    string1: p.string(),
});
const zodSchema = z.object({
    string1: z.string(),
});
const valitaSchema = v.object({
    string1: v.string(),
});

const data = {
    string1: 'hello',
};

bench('This', { group: 'Flat, single' }, () => {
    mySchema.safeParse(data);
});

bench('Zod', { group: 'Flat, single' }, () => {
    zodSchema.safeParse(data);
});

bench('Valita', { group: 'Flat, single' }, () => {
    valitaSchema.try(data);
});
