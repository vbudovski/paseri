import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import * as s from '../../src/index.ts';

const { bench } = Deno;

const mySchema = s.object({
    string1: s.string(),
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
