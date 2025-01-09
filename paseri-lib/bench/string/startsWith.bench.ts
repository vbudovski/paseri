import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().startsWith('foo');
const zodSchema = z.string().startsWith('foo');
const valitaSchema = v.string().assert((value) => value.startsWith('foo'));

const dataValid = 'fooHello, world!';
const dataInvalid = 'Hello, world!';

bench('Paseri', { group: 'Starts with valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Starts with valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Starts with valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Starts with invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Starts with invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Starts with invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
