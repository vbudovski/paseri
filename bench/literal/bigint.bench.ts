import { z } from 'npm:zod';
import * as v from '@badrap/valita';
import * as s from '../../src/index.ts';

const { bench } = Deno;

const mySchema = s.literal(123n);
const zodSchema = z.literal(123n);
const valitaSchema = v.literal(123n);

const dataValid = 123n;
const dataInvalid = 456n;

bench('This', { group: 'BigInt valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'BigInt valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'BigInt valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'BigInt invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'BigInt invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'BigInt invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
