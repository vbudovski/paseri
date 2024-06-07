import { bench, describe } from 'vitest';
import { z } from 'zod';
import { BooleanSchema } from './boolean';

describe('Type valid', () => {
    const data = true;
    const mySchema = new BooleanSchema();
    const zodSchema = z.boolean();

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Type invalid', () => {
    const data = null;
    const mySchema = new BooleanSchema();
    const zodSchema = z.boolean();

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});
