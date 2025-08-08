import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.union(
    p.object({ shape: p.literal('circle'), radius: p.number() }),
    p.object({ shape: p.literal('rectangle'), width: p.number(), height: p.number() }),
);
const zodSchemaRegular = z.union([
    z.strictObject({ shape: z.literal('circle'), radius: z.number() }),
    z.strictObject({ shape: z.literal('rectangle'), width: z.number(), height: z.number() }),
]);
const zodSchemaDiscriminator = z.discriminatedUnion('shape', [
    z.strictObject({ shape: z.literal('circle'), radius: z.number() }),
    z.strictObject({ shape: z.literal('rectangle'), width: z.number(), height: z.number() }),
]);
const valitaSchema = v.union(
    v.object({ shape: v.literal('circle'), radius: v.number() }),
    v.object({ shape: v.literal('rectangle'), width: v.number(), height: v.number() }),
);

const data1 = { shape: 'circle', radius: 30 };
const data2 = { shape: 'rectangle', width: 10, height: 20 };

// Matches first member.
bench('Paseri', { group: 'Discriminated union 1', baseline: true }, () => {
    paseriSchema.safeParse(data1);
});

bench('Zod (regular)', { group: 'Discriminated union 1' }, () => {
    zodSchemaRegular.safeParse(data1);
});

bench('Zod (discriminator)', { group: 'Discriminated union 1' }, () => {
    zodSchemaDiscriminator.safeParse(data1);
});

bench('Valita', { group: 'Discriminated union 1' }, () => {
    valitaSchema.try(data1);
});

// Matches second member.
bench('Paseri', { group: 'Discriminated union 2', baseline: true }, () => {
    paseriSchema.safeParse(data2);
});

bench('Zod (regular)', { group: 'Discriminated union 2' }, () => {
    zodSchemaRegular.safeParse(data2);
});

bench('Zod (discriminator)', { group: 'Discriminated union 2' }, () => {
    zodSchemaDiscriminator.safeParse(data2);
});

bench('Valita', { group: 'Discriminated union 2' }, () => {
    valitaSchema.try(data2);
});
