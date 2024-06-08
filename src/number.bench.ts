import { z } from 'npm:zod';
import { NumberSchema } from './number.ts';

const { bench } = Deno;

bench('This', { group: 'Type valid' }, () => {
    const data = 123;
    const schema = new NumberSchema();

    schema.safeParse(data);
});

bench('Zod', { group: 'Type valid' }, () => {
    const data = 123;
    const schema = z.number();

    schema.safeParse(data);
});

bench('This', { group: 'Type invalid' }, () => {
    const data = null;
    const schema = new NumberSchema();

    schema.safeParse(data);
});

bench('Zod', { group: 'Type invalid' }, () => {
    const data = null;
    const schema = z.number();

    schema.safeParse(data);
});

bench('This', { group: 'Greater than or equal valid' }, () => {
    const data = 10;
    const schema = new NumberSchema().gte(10);

    schema.safeParse(data);
});

bench('Zod', { group: 'Greater than or equal valid' }, () => {
    const data = 10;
    const schema = z.number().gte(10);

    schema.safeParse(data);
});

bench('This', { group: 'Greater than or equal invalid' }, () => {
    const data = 9;
    const schema = new NumberSchema().gte(10);

    schema.safeParse(data);
});

bench('Zod', { group: 'Greater than or equal invalid' }, () => {
    const data = 9;
    const schema = z.number().gte(10);

    schema.safeParse(data);
});

bench('This', { group: 'Greater than valid' }, () => {
    const data = 11;
    const schema = new NumberSchema().gt(10);

    schema.safeParse(data);
});

bench('Zod', { group: 'Greater than valid' }, () => {
    const data = 11;
    const schema = z.number().gt(10);

    schema.safeParse(data);
});

bench('This', { group: 'Greater than invalid' }, () => {
    const data = 10;
    const schema = new NumberSchema().gt(10);

    schema.safeParse(data);
});

bench('Zod', { group: 'Greater than invalid' }, () => {
    const data = 10;
    const schema = z.number().gt(10);

    schema.safeParse(data);
});

bench('This', { group: 'Less than or equal valid' }, () => {
    const data = 10;
    const schema = new NumberSchema().lte(10);

    schema.safeParse(data);
});

bench('Zod', { group: 'Less than or equal valid' }, () => {
    const data = 10;
    const schema = z.number().lte(10);

    schema.safeParse(data);
});

bench('This', { group: 'Less than or equal invalid' }, () => {
    const data = 11;
    const schema = new NumberSchema().lte(10);

    schema.safeParse(data);
});

bench('Zod', { group: 'Less than or equal invalid' }, () => {
    const data = 11;
    const schema = z.number().lte(10);

    schema.safeParse(data);
});

bench('This', { group: 'Less than valid' }, () => {
    const data = 9;
    const schema = new NumberSchema().lt(10);

    schema.safeParse(data);
});

bench('Zod', { group: 'Less than valid' }, () => {
    const data = 9;
    const schema = z.number().lt(10);

    schema.safeParse(data);
});

bench('This', { group: 'Less than invalid' }, () => {
    const data = 10;
    const schema = new NumberSchema().lt(10);

    schema.safeParse(data);
});

bench('Zod', { group: 'Less than invalid' }, () => {
    const data = 10;
    const schema = z.number().lt(10);

    schema.safeParse(data);
});

bench('This', { group: 'Integer valid' }, () => {
    const data = 123;
    const schema = new NumberSchema().int();

    schema.safeParse(data);
});

bench('Zod', { group: 'Integer valid' }, () => {
    const data = 123;
    const schema = z.number().int();

    schema.safeParse(data);
});

bench('This', { group: 'Integer invalid' }, () => {
    const data = 123.4;
    const schema = new NumberSchema().int();

    schema.safeParse(data);
});

bench('Zod', { group: 'Integer invalid' }, () => {
    const data = 123.4;
    const schema = z.number().int();

    schema.safeParse(data);
});

bench('This', { group: 'Finite valid' }, () => {
    const data = 123;
    const schema = new NumberSchema().finite();

    schema.safeParse(data);
});

bench('Zod', { group: 'Finite valid' }, () => {
    const data = 123;
    const schema = z.number().finite();

    schema.safeParse(data);
});

bench('This', { group: 'Finite invalid' }, () => {
    const data = Number.NEGATIVE_INFINITY;
    const schema = new NumberSchema().finite();

    schema.safeParse(data);
});

bench('Zod', { group: 'Finite invalid' }, () => {
    const data = Number.NEGATIVE_INFINITY;
    const schema = z.number().finite();

    schema.safeParse(data);
});

bench('This', { group: 'Safe integer valid' }, () => {
    const data = 123;
    const schema = new NumberSchema().safe();

    schema.safeParse(data);
});

bench('Zod', { group: 'Safe integer valid' }, () => {
    const data = 123;
    const schema = z.number().safe();

    schema.safeParse(data);
});

bench('This', { group: 'Safe integer invalid' }, () => {
    const data = Number.MAX_SAFE_INTEGER + 1;
    const schema = new NumberSchema().safe();

    schema.safeParse(data);
});

bench('Zod', { group: 'Safe integer invalid' }, () => {
    const data = Number.MAX_SAFE_INTEGER + 1;
    const schema = z.number().safe();

    schema.safeParse(data);
});
