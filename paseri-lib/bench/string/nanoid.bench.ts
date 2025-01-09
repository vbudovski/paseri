import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().nanoid();
const zodSchema = z.string().nanoid();

const dataValid = 'V1StGXR8_Z5jdHi6B-myT';
const dataInvalid = 'not_a_nano_id';

bench('Paseri', { group: 'Nano ID valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Nano ID valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'Nano ID invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Nano ID invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
