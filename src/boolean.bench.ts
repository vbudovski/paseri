import { z } from 'npm:zod';
import { BooleanSchema } from './boolean.ts';

const { bench } = Deno;

bench('This', { group: 'Type valid' }, () => {
    const data = true;
    const schema = new BooleanSchema();

    schema.safeParse(data);
});

bench('Zod', { group: 'Type valid' }, () => {
    const data = true;
    const schema = z.boolean();

    schema.safeParse(data);
});

bench('This', { group: 'Type invalid' }, () => {
    const data = null;
    const schema = new BooleanSchema();

    schema.safeParse(data);
});

bench('Zod', { group: 'Type invalid' }, () => {
    const data = null;
    const schema = z.boolean();

    schema.safeParse(data);
});
