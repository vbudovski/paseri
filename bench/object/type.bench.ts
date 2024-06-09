import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import { ObjectSchema } from '../../src/object.ts';
import { StringSchema } from '../../src/string.ts';

const { bench } = Deno;

const mySchema = new ObjectSchema({
    string1: new StringSchema(),
    object1: new ObjectSchema({ string2: new StringSchema() }),
    object2: new ObjectSchema({ object3: new ObjectSchema({ string3: new StringSchema() }) }),
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
