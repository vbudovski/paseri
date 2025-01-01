import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().endsWith('foo');
const zodSchema = z.string().endsWith('foo');
const valitaSchema = v.string().assert((value) => value.endsWith('foo'));

const dataValid = 'Hello, world!foo';
const dataInvalid = 'Hello, world!';

bench('Paseri', { group: 'Ends with valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Ends with valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Ends with valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Ends with invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Ends with invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Ends with invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
