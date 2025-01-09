import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.object({
    string1: p.string(),
    object1: p.object({ string2: p.string() }),
    object2: p.object({ object3: p.object({ string3: p.string() }) }),
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
