import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const mySchema = p.string().nanoid();
const zodSchema = z.string().nanoid();

const dataValid = 'V1StGXR8_Z5jdHi6B-myT';
const dataInvalid = 'not_a_nano_id';

bench('This', { group: 'Nano ID valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Nano ID valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('This', { group: 'Nano ID invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Nano ID invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
