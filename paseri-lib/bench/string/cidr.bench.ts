import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().cidr();
const zodSchema = z.string().cidr();

const dataValid = '10.0.0.0/22';
const dataInvalid = '127.0.0.1';

bench('Paseri', { group: 'CIDR valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'CIDR valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'CIDR invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'CIDR invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
