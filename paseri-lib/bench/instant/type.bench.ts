import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.instant();

const dataValid = Temporal.Instant.from('2020-01-01T00:00:00Z');
const dataInvalid = null;

bench('Paseri', { group: 'Type valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'Type invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});
