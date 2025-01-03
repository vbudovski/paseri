import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().time();
const zodSchema = z.string().time();

const dataValid = '00:00:00';
const dataInvalid = '99:99:99';

bench('Paseri', { group: 'Time valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Time valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'Time invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Time invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
