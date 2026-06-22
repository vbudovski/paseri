import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().url();
const zodSchema = z.url();

const dataValid = 'https://example.com/path?query=1#fragment';
const dataInvalid = 'not_a_url';

bench('Paseri', { group: 'URL valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'URL valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'URL invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'URL invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
