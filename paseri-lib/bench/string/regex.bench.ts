import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const regex = /^a+$/;
const paseriSchema = p.string().regex(regex);
const zodSchema = z.string().regex(regex);

const dataValid = 'a'.repeat(20);
const dataInvalid = `${'a'.repeat(30)}#`;

bench('Paseri', { group: 'Date valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Date valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'Date invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Date invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
