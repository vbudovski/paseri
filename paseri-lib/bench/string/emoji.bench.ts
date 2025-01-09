import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().emoji();
const zodSchema = z.string().emoji();

const dataValid = '🥳';
const dataInvalid = 'a';

bench('Paseri', { group: 'Emoji valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Emoji valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'Emoji invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Emoji invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
