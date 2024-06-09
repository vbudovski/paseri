import { z } from 'npm:zod';
import * as s from '../../src/index.ts';

const { bench } = Deno;

const mySchema = s.string().email();
const zodSchema = z.string().email();

const dataValid = 'hello@example.com';
const dataInvalid = 'not_an_email';

bench('This', { group: 'Email valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Email valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('This', { group: 'Email invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Email invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});