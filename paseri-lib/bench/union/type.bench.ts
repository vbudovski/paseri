import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.union(p.string(), p.number(), p.boolean());
const zodSchema = z.union([z.string(), z.number(), z.boolean()]);
const valitaSchema = v.union(v.string(), v.number(), v.boolean());

const dataValid1 = 'Hello, world!';
const dataValid2 = 123;
const dataValid3 = true;
const dataInvalid = null;

// Matches first member.
bench('Paseri', { group: 'Type valid 1', baseline: true }, () => {
    paseriSchema.safeParse(dataValid1);
});

bench('Zod', { group: 'Type valid 1' }, () => {
    zodSchema.safeParse(dataValid1);
});

bench('Valita', { group: 'Type valid 1' }, () => {
    valitaSchema.try(dataValid1);
});

// Matches second member.
bench('Paseri', { group: 'Type valid 2', baseline: true }, () => {
    paseriSchema.safeParse(dataValid2);
});

bench('Zod', { group: 'Type valid 2' }, () => {
    zodSchema.safeParse(dataValid2);
});

bench('Valita', { group: 'Type valid 2' }, () => {
    valitaSchema.try(dataValid2);
});

// Matches third member.
bench('Paseri', { group: 'Type valid 3', baseline: true }, () => {
    paseriSchema.safeParse(dataValid3);
});

bench('Zod', { group: 'Type valid 3' }, () => {
    zodSchema.safeParse(dataValid3);
});

bench('Valita', { group: 'Type valid 3' }, () => {
    valitaSchema.try(dataValid3);
});

bench('Paseri', { group: 'Type invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Type invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Type invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
