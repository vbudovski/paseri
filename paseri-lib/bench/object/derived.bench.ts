import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

// Schemas derived via pick parse against an assembled shape object rather than the user's literal,
// which routes through the Map-based field lookup.
const paseriSchema = p
    .object({
        string1: p.string(),
        string2: p.string(),
        number1: p.number(),
        number2: p.number(),
        boolean1: p.boolean(),
        string3: p.string(),
        number3: p.number(),
        boolean2: p.boolean(),
        string4: p.string(),
        number4: p.number(),
    })
    .pick('string1', 'string2', 'number1', 'number2', 'boolean1', 'string3', 'number3');
const zodSchema = z
    .strictObject({
        string1: z.string(),
        string2: z.string(),
        number1: z.number(),
        number2: z.number(),
        boolean1: z.boolean(),
        string3: z.string(),
        number3: z.number(),
        boolean2: z.boolean(),
        string4: z.string(),
        number4: z.number(),
    })
    .pick({
        string1: true,
        string2: true,
        number1: true,
        number2: true,
        boolean1: true,
        string3: true,
        number3: true,
    });
const valitaSchema = v
    .object({
        string1: v.string(),
        string2: v.string(),
        number1: v.number(),
        number2: v.number(),
        boolean1: v.boolean(),
        string3: v.string(),
        number3: v.number(),
        boolean2: v.boolean(),
        string4: v.string(),
        number4: v.number(),
    })
    .pick('string1', 'string2', 'number1', 'number2', 'boolean1', 'string3', 'number3');

const data = {
    string1: 'hello',
    string2: 'world',
    number1: 1,
    number2: 2,
    boolean1: true,
    string3: 'lorem',
    number3: 3,
};

bench('Paseri', { group: 'Derived (pick)', baseline: true }, () => {
    paseriSchema.safeParse(data);
});

bench('Zod', { group: 'Derived (pick)' }, () => {
    zodSchema.safeParse(data);
});

bench('Valita', { group: 'Derived (pick)' }, () => {
    valitaSchema.try(data, { mode: 'strict' });
});
