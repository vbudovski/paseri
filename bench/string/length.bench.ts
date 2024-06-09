import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import { StringSchema } from '../../src/string.ts';

const { bench } = Deno;

const mySchema = new StringSchema().length(3);
const zodSchema = z.string().length(3);
const valitaSchema = v.string().assert((value) => value.length === 3);

const dataValid = 'aaa';
const dataTooLong = 'aaaa';
const dataTooShort = 'aa';

bench('This', { group: 'Length valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Length valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Length valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Length too long' }, () => {
    mySchema.safeParse(dataTooLong);
});

bench('Zod', { group: 'Length too long' }, () => {
    zodSchema.safeParse(dataTooLong);
});

bench('Valita', { group: 'Length too long' }, () => {
    valitaSchema.try(dataTooLong);
});

bench('This', { group: 'Length too short' }, () => {
    mySchema.safeParse(dataTooShort);
});

bench('Zod', { group: 'Length too short' }, () => {
    zodSchema.safeParse(dataTooShort);
});

bench('Valita', { group: 'Length too short' }, () => {
    valitaSchema.try(dataTooShort);
});
