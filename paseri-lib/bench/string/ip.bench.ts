import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().ip();
const zodSchema = z.string().ip();

const dataValid = '192.168.1.254';
const dataInvalid = '999';

bench('Paseri', { group: 'IP valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'IP valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'IP invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'IP invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
