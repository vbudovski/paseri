import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.duration();

const dataValid = Temporal.Duration.from({ hours: 1 });
const dataInvalid = null;

bench('Paseri', { group: 'Type valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'Type invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});
