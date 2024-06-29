import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const mySchema = p.unknown();
const zodSchema = z.unknown();
const valitaSchema = v.unknown();

const data = 'Hello, world!';

bench('This', { group: 'Type valid' }, () => {
    mySchema.safeParse(data);
});

bench('Zod', { group: 'Type valid' }, () => {
    zodSchema.safeParse(data);
});

bench('Valita', { group: 'Type valid' }, () => {
    valitaSchema.try(data);
});
