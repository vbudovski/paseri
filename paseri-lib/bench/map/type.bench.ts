import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.map(p.number(), p.string());
const zodSchema = z.map(z.number(), z.string());

const dataValid = new Map<number, string>([
    [1, 'foo'],
    [2, 'bar'],
    [3, 'baz'],
    [4, 'foo'],
    [5, 'bar'],
    [6, 'baz'],
    [7, 'foo'],
    [8, 'bar'],
    [9, 'baz'],
    [10, 'foo'],
    [11, 'bar'],
    [12, 'baz'],
    [13, 'foo'],
    [14, 'bar'],
    [15, 'baz'],
    [16, 'foo'],
    [17, 'bar'],
    [18, 'baz'],
    [19, 'foo'],
    [20, 'bar'],
]);
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
