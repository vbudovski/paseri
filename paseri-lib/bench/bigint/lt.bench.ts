import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.bigint().lt(10n);
const zodSchema = z.bigint().lt(10n);
const valitaSchema = v.bigint().assert((value) => value < 10n);

const dataValid = 9n;
const dataInvalid = 10n;

bench('Paseri', { group: 'Less than valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Less than valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Less than valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Less than invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Less than invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Less than invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
