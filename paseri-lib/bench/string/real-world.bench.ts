import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().min(5).max(50).email().endsWith('gmail.com');
const zodSchema = z.string().min(5).max(50).email().endsWith('gmail.com');

const dataValid = 'foo@gmail.com';
const dataInvalid = 'bar@example.test';

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
