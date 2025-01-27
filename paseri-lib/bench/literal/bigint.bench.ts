import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.literal(123n);
const zodSchema = z.literal(123n);
const valitaSchema = v.literal(123n);

const dataValid = 123n;
const dataInvalid = 456n;

bench('Paseri', { group: 'BigInt valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'BigInt valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'BigInt valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'BigInt invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'BigInt invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'BigInt invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
