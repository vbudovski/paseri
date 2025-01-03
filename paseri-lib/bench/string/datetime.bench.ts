import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().datetime();
const zodSchema = z.string().datetime();

const dataValid = '2020-01-01T01:02:03.45678Z';
const dataInvalid = '2024-01-32T00:00:00';

bench('Paseri', { group: 'Datetime valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Datetime valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'Datetime invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Datetime invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
