import { z } from 'npm:zod';
import { StringSchema } from './string.ts';

const { bench } = Deno;

bench('This', { group: 'Type valid' }, () => {
    const data = 'Hello, world!';
    const schema = new StringSchema();

    schema.safeParse(data);
});

bench('Zod', { group: 'Type valid' }, () => {
    const data = 'Hello, world!';
    const schema = z.string();

    schema.safeParse(data);
});

bench('This', { group: 'Type invalid' }, () => {
    const data = null;
    const schema = new StringSchema();

    schema.safeParse(data);
});

bench('Zod', { group: 'Type invalid' }, () => {
    const data = null;
    const schema = z.string();

    schema.safeParse(data);
});

bench('This', { group: 'Min valid' }, () => {
    const data = 'aaa';
    const schema = new StringSchema().min(3);

    schema.safeParse(data);
});

bench('Zod', { group: 'Min valid' }, () => {
    const data = 'aaa';
    const schema = z.string().min(3);

    schema.safeParse(data);
});

bench('This', { group: 'Min invalid' }, () => {
    const data = 'aa';
    const schema = new StringSchema().min(3);

    schema.safeParse(data);
});

bench('Zod', { group: 'Min invalid' }, () => {
    const data = 'aa';
    const schema = z.string().min(3);

    schema.safeParse(data);
});

bench('This', { group: 'Max valid' }, () => {
    const data = 'aaa';
    const schema = new StringSchema().max(3);

    schema.safeParse(data);
});

bench('Zod', { group: 'Max valid' }, () => {
    const data = 'aaa';
    const schema = z.string().max(3);

    schema.safeParse(data);
});

bench('This', { group: 'Max invalid' }, () => {
    const data = 'aaaa';
    const schema = new StringSchema().max(3);

    schema.safeParse(data);
});

bench('Zod', { group: 'Max invalid' }, () => {
    const data = 'aaaa';
    const schema = z.string().max(3);

    schema.safeParse(data);
});

bench('This', { group: 'Length valid' }, () => {
    const data = 'aaa';
    const schema = new StringSchema().length(3);

    schema.safeParse(data);
});

bench('Zod', { group: 'Length valid' }, () => {
    const data = 'aaa';
    const schema = z.string().length(3);

    schema.safeParse(data);
});

bench('This', { group: 'Length too long' }, () => {
    const data = 'aaaa';
    const schema = new StringSchema().length(3);

    schema.safeParse(data);
});

bench('Zod', { group: 'Length too long' }, () => {
    const data = 'aaaa';
    const schema = z.string().length(3);

    schema.safeParse(data);
});

bench('This', { group: 'Length too short' }, () => {
    const data = 'aa';
    const schema = new StringSchema().length(3);

    schema.safeParse(data);
});

bench('Zod', { group: 'Length too short' }, () => {
    const data = 'aa';
    const schema = z.string().length(3);

    schema.safeParse(data);
});

bench('This', { group: 'Email valid' }, () => {
    const data = 'hello@example.com';
    const schema = new StringSchema().email();

    schema.safeParse(data);
});

bench('Zod', { group: 'Email valid' }, () => {
    const data = 'hello@example.com';
    const schema = z.string().email();

    schema.safeParse(data);
});

bench('This', { group: 'Email invalid' }, () => {
    const data = 'not_an_email';
    const schema = new StringSchema().email();

    schema.safeParse(data);
});

bench('Zod', { group: 'Email invalid' }, () => {
    const data = 'not_an_email';
    const schema = z.string().email();

    schema.safeParse(data);
});

bench('This', { group: 'Emoji valid' }, () => {
    const data = '🥳';
    const schema = new StringSchema().emoji();

    schema.safeParse(data);
});

bench('Zod', { group: 'Emoji valid' }, () => {
    const data = '🥳';
    const schema = z.string().emoji();

    schema.safeParse(data);
});

bench('This', { group: 'Emoji invalid' }, () => {
    const data = 'a';
    const schema = new StringSchema().emoji();

    schema.safeParse(data);
});

bench('Zod', { group: 'Emoji invalid' }, () => {
    const data = 'a';
    const schema = z.string().emoji();

    schema.safeParse(data);
});

bench('This', { group: 'UUID valid' }, () => {
    const data = 'd98d4b7e-58a5-4e21-839b-2699b94c115b';
    const schema = new StringSchema().uuid();

    schema.safeParse(data);
});

bench('Zod', { group: 'UUID valid' }, () => {
    const data = 'd98d4b7e-58a5-4e21-839b-2699b94c115b';
    const schema = z.string().uuid();

    schema.safeParse(data);
});

bench('This', { group: 'UUID invalid' }, () => {
    const data = 'not_a_uuid';
    const schema = new StringSchema().uuid();

    schema.safeParse(data);
});

bench('Zod', { group: 'UUID invalid' }, () => {
    const data = 'not_a_uuid';
    const schema = z.string().uuid();

    schema.safeParse(data);
});

bench('This', { group: 'Nano ID valid' }, () => {
    const data = 'V1StGXR8_Z5jdHi6B-myT';
    const schema = new StringSchema().nanoid();

    schema.safeParse(data);
});

bench('Zod', { group: 'Nano ID valid' }, () => {
    const data = 'V1StGXR8_Z5jdHi6B-myT';
    const schema = z.string().nanoid();

    schema.safeParse(data);
});

bench('This', { group: 'Nano ID invalid' }, () => {
    const data = 'not_a_nano_id';
    const schema = new StringSchema().nanoid();

    schema.safeParse(data);
});

bench('Zod', { group: 'Nano ID invalid' }, () => {
    const data = 'not_a_nano_id';
    const schema = z.string().nanoid();

    schema.safeParse(data);
});
