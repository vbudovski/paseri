import { bench, describe } from 'vitest';
import { z } from 'zod';
import { StringSchema } from './string';

describe('Type valid', () => {
    const data = 'Hello, world!';
    const mySchema = new StringSchema();
    const zodSchema = z.string();

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Type invalid', () => {
    const data = null;
    const mySchema = new StringSchema();
    const zodSchema = z.string();

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Min valid', () => {
    const data = 'Hello, world!';
    const mySchema = new StringSchema().min(3);
    const zodSchema = z.string().min(3);

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Min invalid', () => {
    const data = 'aa';
    const mySchema = new StringSchema().min(3);
    const zodSchema = z.string().min(3);

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Max valid', () => {
    const data = 'aaa';
    const mySchema = new StringSchema().max(3);
    const zodSchema = z.string().max(3);

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Max invalid', () => {
    const data = 'aaaa';
    const mySchema = new StringSchema().max(3);
    const zodSchema = z.string().max(3);

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Length valid', () => {
    const data = 'aaa';
    const mySchema = new StringSchema().length(3);
    const zodSchema = z.string().length(3);

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Length too long', () => {
    const data = 'aaaa';
    const mySchema = new StringSchema().length(3);
    const zodSchema = z.string().length(3);

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Length too short', () => {
    const data = 'aa';
    const mySchema = new StringSchema().length(3);
    const zodSchema = z.string().length(3);

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Email valid', () => {
    const data = 'hello@example.com';
    const mySchema = new StringSchema().email();
    const zodSchema = z.string().email();

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Email invalid', () => {
    const data = 'not_an_email';
    const mySchema = new StringSchema().email();
    const zodSchema = z.string().email();

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Emoji valid', () => {
    const data = '🥳';
    const mySchema = new StringSchema().emoji();
    const zodSchema = z.string().emoji();

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Emoji invalid', () => {
    const data = 'a';
    const mySchema = new StringSchema().emoji();
    const zodSchema = z.string().emoji();

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('UUID valid', () => {
    const data = 'd98d4b7e-58a5-4e21-839b-2699b94c115b';
    const mySchema = new StringSchema().uuid();
    const zodSchema = z.string().uuid();

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('UUID invalid', () => {
    const data = 'not_a_uuid';
    const mySchema = new StringSchema().uuid();
    const zodSchema = z.string().uuid();

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Nano ID valid', () => {
    const data = 'V1StGXR8_Z5jdHi6B-myT';
    const mySchema = new StringSchema().nanoid();
    const zodSchema = z.string().nanoid();

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});

describe('Nano ID invalid', () => {
    const data = 'not_a_nano_id';
    const mySchema = new StringSchema().nanoid();
    const zodSchema = z.string().nanoid();

    bench('This', () => {
        mySchema.safeParse(data);
    });

    bench('Zod', () => {
        zodSchema.safeParse(data);
    });
});
