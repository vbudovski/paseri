import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().length(3);
const zodSchema = z.string().length(3);
const valitaSchema = v.string().assert((value) => value.length === 3);

const dataValid = 'aaa';
const dataTooLong = 'aaaa';
const dataTooShort = 'aa';

bench('Paseri', { group: 'Length valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Length valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Length valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Length too long' }, () => {
    paseriSchema.safeParse(dataTooLong);
});

bench('Zod', { group: 'Length too long' }, () => {
    zodSchema.safeParse(dataTooLong);
});

bench('Valita', { group: 'Length too long' }, () => {
    valitaSchema.try(dataTooLong);
});

bench('Paseri', { group: 'Length too short' }, () => {
    paseriSchema.safeParse(dataTooShort);
});

bench('Zod', { group: 'Length too short' }, () => {
    zodSchema.safeParse(dataTooShort);
});

bench('Valita', { group: 'Length too short' }, () => {
    valitaSchema.try(dataTooShort);
});
