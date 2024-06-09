import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import * as s from '../../src/index.ts';

const { bench } = Deno;

const mySchema = s.object({
    string1: s.string(),
    object1: s.object({ string2: s.string() }),
    object2: s.object({ object3: s.object({ string3: s.string() }) }),
});
const zodSchema = z.object({
    string1: z.string(),
    object1: z.object({ string2: z.string() }),
    object2: z.object({ object3: z.object({ string3: z.string() }) }),
});
const valitaSchema = v.object({
    string1: v.string(),
    object1: v.object({ string2: v.string() }),
    object2: v.object({ object3: v.object({ string3: v.string() }) }),
});

const dataValid = {
    string1: 'hello',
    object1: { string2: 'world' },
    object2: { object3: { string3: 'abc' } },
};
const dataInvalid = null;

bench('This', { group: 'Type valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Type valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Type valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Type invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Type invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Type invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
