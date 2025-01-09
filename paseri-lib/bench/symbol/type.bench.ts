import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.symbol();
const zodSchema = z.symbol();

const dataValid = Symbol.for('foo');
const dataInvalid = null;

bench('Paseri', { group: 'Type valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Type valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'Type invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Type invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
