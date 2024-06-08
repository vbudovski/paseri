import { z } from 'npm:zod';
import { ObjectSchema } from './object.ts';
import { StringSchema } from './string.ts';

const { bench } = Deno;

bench('This', { group: 'Type valid' }, () => {
    const data = {
        string1: 'hello',
        object1: { string2: 'world' },
        object2: { object3: { string3: 'abc' } },
    };
    const schema = new ObjectSchema({
        string1: new StringSchema(),
        object1: new ObjectSchema({ string2: new StringSchema() }),
        object2: new ObjectSchema({ object3: new ObjectSchema({ string3: new StringSchema() }) }),
    });

    schema.safeParse(data);
});

bench('Zod', { group: 'Type valid' }, () => {
    const data = {
        string1: 'hello',
        object1: { string2: 'world' },
        object2: { object3: { string3: 'abc' } },
    };
    const schema = z.object({
        string1: z.string(),
        object1: z.object({ string2: z.string() }),
        object2: z.object({ object3: z.object({ string3: z.string() }) }),
    });

    schema.safeParse(data);
});

bench('This', { group: 'Type invalid' }, () => {
    const data = null;
    const schema = new ObjectSchema({
        string1: new StringSchema(),
        object1: new ObjectSchema({ string2: new StringSchema() }),
        object2: new ObjectSchema({ object3: new ObjectSchema({ string3: new StringSchema() }) }),
    });

    schema.safeParse(data);
});

bench('Zod', { group: 'Type invalid' }, () => {
    const data = null;
    const schema = z.object({
        string1: z.string(),
        object1: z.object({ string2: z.string() }),
        object2: z.object({ object3: z.object({ string3: z.string() }) }),
    });

    schema.safeParse(data);
});
