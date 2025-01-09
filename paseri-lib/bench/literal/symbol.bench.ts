import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const symbolLiteral = Symbol.for('test');

const paseriSchema = p.literal(symbolLiteral);
const zodSchema = z.literal(symbolLiteral);

const dataValid = Symbol.for('test');
const dataInvalid = Symbol.for('other');

bench('Paseri', { group: 'Symbol valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Symbol valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'Symbol invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Symbol invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
