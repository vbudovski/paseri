import * as p from '../../src/index.ts';

const { bench } = Deno;

const schema = p.object({
    foo: p.string(),
    bar: p.string(),
    baz: p.string(),
});

const dataNormal = {
    foo: 'lorem',
    bar: 'ipsum',
    baz: 'dolor',
};

const dataFrozen = Object.freeze({
    foo: 'lorem',
    bar: 'ipsum',
    baz: 'dolor',
});

const dataSealed = Object.seal({
    foo: 'lorem',
    bar: 'ipsum',
    baz: 'dolor',
});

const dataExtensionPrevented = Object.preventExtensions({
    foo: 'lorem',
    bar: 'ipsum',
    baz: 'dolor',
});

bench('Normal', () => {
    schema.parse(dataNormal);
});

bench('Frozen', () => {
    schema.parse(dataFrozen);
});

bench('Sealed', () => {
    schema.parse(dataSealed);
});

bench('Extension prevented', () => {
    schema.parse(dataExtensionPrevented);
});
