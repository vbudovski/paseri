import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p
    .object({
        id: p.number(),
        name: p.string(),
        active: p.boolean(),
        score: p.number(),
        label: p.string(),
        kind: p.string(),
    })
    .passthrough();
const zodSchema = z.looseObject({
    id: z.number(),
    name: z.string(),
    active: z.boolean(),
    score: z.number(),
    label: z.string(),
    kind: z.string(),
});
const valitaSchema = v
    .object({
        id: v.number(),
        name: v.string(),
        active: v.boolean(),
        score: v.number(),
        label: v.string(),
        kind: v.string(),
    })
    .rest(v.unknown());

const dataExact = { id: 1, name: 'a', active: true, score: 2.5, label: 'x', kind: 'y' };
const dataExtras = { ...dataExact, extra1: 1, extra2: 'b', extra3: false, extra4: 9, extra5: 'c', extra6: null };

bench('Paseri', { group: 'Passthrough with unrecognised keys', baseline: true }, () => {
    paseriSchema.safeParse(dataExtras);
});

bench('Zod', { group: 'Passthrough with unrecognised keys' }, () => {
    zodSchema.safeParse(dataExtras);
});

bench('Valita', { group: 'Passthrough with unrecognised keys' }, () => {
    valitaSchema.try(dataExtras);
});

bench('Paseri', { group: 'Passthrough without unrecognised keys', baseline: true }, () => {
    paseriSchema.safeParse(dataExact);
});

bench('Zod', { group: 'Passthrough without unrecognised keys' }, () => {
    zodSchema.safeParse(dataExact);
});

bench('Valita', { group: 'Passthrough without unrecognised keys' }, () => {
    valitaSchema.try(dataExact);
});
