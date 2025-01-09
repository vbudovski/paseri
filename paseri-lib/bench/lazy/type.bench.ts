import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

type T = string | T[];

const paseriSchema: p.Schema<T> = p.lazy(() => p.union(p.string(), p.array(paseriSchema)));
const zodSchema: z.ZodType<T> = z.lazy(() => z.union([z.string(), z.array(zodSchema)]));
// @ts-ignore TS2322 FIXME: Fails in TypeScript 5.6+.
const valitaSchema: v.Type<T> = v.lazy(() => v.union(v.string(), v.array(valitaSchema)));

const dataValid1 = 'Hello, world!';
const dataValid2 = ['foo', 'bar'];
const dataValid3 = ['foo', ['bar', 'baz']];

bench('Paseri', { group: 'Type valid 1', baseline: true }, () => {
    paseriSchema.safeParse(dataValid1);
});

bench('Zod', { group: 'Type valid 1' }, () => {
    zodSchema.safeParse(dataValid1);
});

bench('Valita', { group: 'Type valid 1' }, () => {
    valitaSchema.try(dataValid1);
});

bench('Paseri', { group: 'Type valid 2', baseline: true }, () => {
    paseriSchema.safeParse(dataValid2);
});

bench('Zod', { group: 'Type valid 2' }, () => {
    zodSchema.safeParse(dataValid2);
});

bench('Valita', { group: 'Type valid 2' }, () => {
    valitaSchema.try(dataValid2);
});

bench('Paseri', { group: 'Type valid 3', baseline: true }, () => {
    paseriSchema.safeParse(dataValid3);
});

bench('Zod', { group: 'Type valid 3' }, () => {
    zodSchema.safeParse(dataValid3);
});

bench('Valita', { group: 'Type valid 3' }, () => {
    valitaSchema.try(dataValid3);
});
