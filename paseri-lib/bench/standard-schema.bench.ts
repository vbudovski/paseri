import { z } from 'zod';
import * as p from '../src/index.ts';

const { bench } = Deno;

// Valita (0.5.x) does not implement the Standard Schema interface, so only Zod is compared here.

const paseriSchema = p.object({
    name: p.string(),
    age: p.number(),
    tags: p.array(p.string()),
});
const zodSchema = z.object({
    name: z.string(),
    age: z.number(),
    tags: z.array(z.string()),
});

const dataValid = { name: 'Ada', age: 36, tags: ['a', 'b'] };
const dataInvalid = { name: 'Ada', age: 'not-a-number', tags: ['a', 'b'] };

// Consumers read `schema['~standard']` per validation call, so the property access is part of the
// measured path.
bench('Paseri', { group: 'Standard Schema valid', baseline: true }, () => {
    paseriSchema['~standard'].validate(dataValid);
});

bench('Zod', { group: 'Standard Schema valid' }, () => {
    zodSchema['~standard'].validate(dataValid);
});

bench('Paseri', { group: 'Standard Schema invalid', baseline: true }, () => {
    paseriSchema['~standard'].validate(dataInvalid);
});

bench('Zod', { group: 'Standard Schema invalid' }, () => {
    zodSchema['~standard'].validate(dataInvalid);
});
