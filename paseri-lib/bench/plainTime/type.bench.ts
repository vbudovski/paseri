import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.plainTime();

const dataValid = Temporal.PlainTime.from('12:00:00');
const dataInvalid = null;

bench('Paseri', { group: 'Type valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'Type invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});
