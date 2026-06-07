import * as p from '@paseri/paseri';
import { compile } from './_harness.ts';

const { bench } = Deno;

const strictSchema = p
    .object({
        number: p.number(),
        negNumber: p.number(),
        maxNumber: p.number(),
        string: p.string(),
        longString: p.string(),
        boolean: p.boolean(),
        deeplyNested: p.object({ foo: p.string(), num: p.number(), bool: p.boolean() }).strict(),
    })
    .strict();
const stripSchema = p
    .object({
        number: p.number(),
        negNumber: p.number(),
        maxNumber: p.number(),
        string: p.string(),
        longString: p.string(),
        boolean: p.boolean(),
        deeplyNested: p.object({ foo: p.string(), num: p.number(), bool: p.boolean() }).strip(),
    })
    .strip();
const passthroughSchema = p
    .object({
        number: p.number(),
        negNumber: p.number(),
        maxNumber: p.number(),
        string: p.string(),
        longString: p.string(),
        boolean: p.boolean(),
        deeplyNested: p.object({ foo: p.string(), num: p.number(), bool: p.boolean() }).passthrough(),
    })
    .passthrough();

const data = Object.freeze({
    number: 1,
    negNumber: -1,
    maxNumber: Number.MAX_VALUE,
    string: 'string',
    longString:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    boolean: true,
    deeplyNested: { foo: 'bar', num: 1, bool: false },
});

const compiledStrict = await compile(strictSchema, 'Strict');
const compiledStrip = await compile(stripSchema, 'Strip');
const compiledPassthrough = await compile(passthroughSchema, 'Passthrough');

bench('Runtime', { group: 'Parse strict', baseline: true }, () => {
    strictSchema.safeParse(data);
});
bench('AOT', { group: 'Parse strict' }, () => {
    compiledStrict(data);
});

bench('Runtime', { group: 'Parse strip', baseline: true }, () => {
    stripSchema.safeParse(data);
});
bench('AOT', { group: 'Parse strip' }, () => {
    compiledStrip(data);
});

bench('Runtime', { group: 'Parse passthrough', baseline: true }, () => {
    passthroughSchema.safeParse(data);
});
bench('AOT', { group: 'Parse passthrough' }, () => {
    compiledPassthrough(data);
});
