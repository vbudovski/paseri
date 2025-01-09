import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../src/index.ts';

const { bench } = Deno;

const paseriSchema = p
    .object({
        number: p.number(),
        negNumber: p.number(),
        maxNumber: p.number(),
        string: p.string(),
        longString: p.string(),
        boolean: p.boolean(),
        deeplyNested: p
            .object({
                foo: p.string(),
                num: p.number(),
                bool: p.boolean(),
            })
            .strict(),
    })
    .strict();
const zodSchema = z
    .object({
        number: z.number(),
        negNumber: z.number(),
        maxNumber: z.number(),
        string: z.string(),
        longString: z.string(),
        boolean: z.boolean(),
        deeplyNested: z
            .object({
                foo: z.string(),
                num: z.number(),
                bool: z.boolean(),
            })
            .strict(),
    })
    .strict();
const valitaSchema = v.object({
    number: v.number(),
    negNumber: v.number(),
    maxNumber: v.number(),
    string: v.string(),
    longString: v.string(),
    boolean: v.boolean(),
    deeplyNested: v.object({
        foo: v.string(),
        num: v.number(),
        bool: v.boolean(),
    }),
});

const data = Object.freeze({
    number: 1,
    negNumber: -1,
    maxNumber: Number.MAX_VALUE,
    string: 'string',
    longString:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vip. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    boolean: true,
    deeplyNested: {
        foo: 'bar',
        num: 1,
        bool: false,
    },
});

bench('Paseri', { group: 'Parse strict', baseline: true }, () => {
    paseriSchema.safeParse(data);
});

bench('Zod', { group: 'Parse strict' }, () => {
    zodSchema.safeParse(data);
});

bench('Valita', { group: 'Parse strict' }, () => {
    valitaSchema.try(data, { mode: 'strict' });
});
