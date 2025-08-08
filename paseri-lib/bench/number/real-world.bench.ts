import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.number().gte(18).lte(99).int();
const zodSchema = z.number().gte(18).lte(99).int();

const dataValid = 19;
const dataInvalid = 30.9;

bench('Paseri', { group: 'Real-world valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Real-world valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'Real-world invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Real-world invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
