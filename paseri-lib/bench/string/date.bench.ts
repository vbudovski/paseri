import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().date();
const zodSchema = z.string().date();

const dataValid = '2020-01-01';
const dataInvalid = '2024-01-32';

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
