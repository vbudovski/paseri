import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().includes('foo');
const zodSchema = z.string().includes('foo');
const valitaSchema = v.string().assert((value) => value.includes('foo'));

const dataValid = 'Hello,fooworld!';
const dataInvalid = 'Hello, world!';

bench('Paseri', { group: 'Includes valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Includes valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Includes valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Includes invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Includes invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Includes invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
