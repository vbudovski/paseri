import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.never();
const zodSchema = z.never();
const valitaSchema = v.never();

const data = 'Hello, world!';

bench('Paseri', { group: 'Type valid', baseline: true }, () => {
    paseriSchema.safeParse(data);
});

bench('Zod', { group: 'Type valid' }, () => {
    zodSchema.safeParse(data);
});

bench('Valita', { group: 'Type valid' }, () => {
    valitaSchema.try(data);
});
