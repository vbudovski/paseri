import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import { StringSchema } from '../../src/string.ts';

const { bench } = Deno;

const mySchema = new StringSchema().min(3);
const zodSchema = z.string().min(3);
const valitaSchema = v.string().assert((value) => value.length >= 3);

const dataValid = 'aaa';
const dataInvalid = 'aa';

bench('This', { group: 'Min valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Min valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Min valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Min invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Min invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Min invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
