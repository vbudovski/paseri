import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const mySchema = p.bigint().lte(10n);
const zodSchema = z.bigint().lte(10n);
const valitaSchema = v.bigint().assert((value) => value <= 10n);

const dataValid = 10n;
const dataInvalid = 11n;

bench('This', { group: 'Less than or equal valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Less than or equal valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Less than or equal valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('This', { group: 'Less than or equal invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Less than or equal invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Less than or equal invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
