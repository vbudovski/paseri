import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().email();
const zodSchema = z.string().email();

const dataValid = 'hello@example.com';
const dataInvalid = 'not_an_email';

bench('Paseri', { group: 'Email valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Email valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'Email invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Email invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
