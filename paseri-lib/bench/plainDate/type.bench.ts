import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.plainDate();

const dataValid = Temporal.PlainDate.from('2020-01-01');
const dataInvalid = null;

bench('Paseri', { group: 'Type valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'Type invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});
