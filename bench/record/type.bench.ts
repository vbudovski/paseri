import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.record(p.string());
const zodSchema = z.record(z.string());
const valitaSchema = v.record(v.string());

const dataValid = {
    string1: 'hello',
    string2: 'world',
    string3: 'lorem',
    string4: 'foo',
    string5: 'bar',
    string6: 'baz',
};
const dataInvalid = null;

bench('Paseri', { group: 'Type' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Type' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Type' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Type invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Type invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Type invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
