import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.bigint().gt(10n);
const zodSchema = z.bigint().gt(10n);
const valitaSchema = v.bigint().assert((value) => value > 10n);

const dataValid = 11n;
const dataInvalid = 10n;

bench('Paseri', { group: 'Greater than valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Greater than valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Greater than valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Greater than invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Greater than invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Greater than invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
