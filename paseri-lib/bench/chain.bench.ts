import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().chain(p.bigint(), (value) => {
    try {
        return p.ok(BigInt(value));
    } catch {
        return p.err('invalid_bigint');
    }
});
const zodSchema = z.string().transform((value, ctx) => {
    try {
        return BigInt(value);
    } catch {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Not a bigint',
        });

        return z.NEVER;
    }
});
const valitaSchema = v.string().chain((value) => {
    try {
        return v.ok(BigInt(value));
    } catch {
        return v.err('Not a bigint');
    }
});

const dataValid = '9007199254740992';
const dataInvalid = 'BAD';

bench('Paseri', { group: 'Type valid' }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'Type valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Valita', { group: 'Type valid' }, () => {
    valitaSchema.try(dataValid);
});

bench('Paseri', { group: 'Type invalid' }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Type invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Valita', { group: 'Type invalid' }, () => {
    valitaSchema.try(dataInvalid);
});
