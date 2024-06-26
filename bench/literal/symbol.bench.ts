import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const symbolLiteral = Symbol.for('test');

const mySchema = p.literal(symbolLiteral);
const zodSchema = z.literal(symbolLiteral);

const dataValid = Symbol.for('test');
const dataInvalid = Symbol.for('other');

bench('This', { group: 'Symbol valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Symbol valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('This', { group: 'Symbol invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Symbol invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});