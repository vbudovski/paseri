import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.bigint().gte(10n);
const zodSchema = z.bigint().gte(10n);
const valitaSchema = v.bigint().assert((value) => value >= 10n);

const dataValid = 10n;
const dataInvalid = 9n;

bench('Paseri', { group: 'Greater than or equal valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Greater than or equal valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Greater than or equal valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Greater than or equal invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Greater than or equal invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Greater than or equal invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
