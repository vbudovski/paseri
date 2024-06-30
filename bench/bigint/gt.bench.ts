import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const mySchema = p.bigint().gt(10n);
const zodSchema = z.bigint().gt(10n);
const valitaSchema = v.bigint().assert((value) => value > 10n);

const dataValid = 11n;
const dataInvalid = 10n;

bench('This', { group: 'Greater than valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Greater than valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Greater than valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Greater than invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Greater than invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Greater than invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
