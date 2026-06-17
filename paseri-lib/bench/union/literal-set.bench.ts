import * as v from '@badrap/valita';
import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseri3 = p.union(p.literal('GET'), p.literal('POST'), p.literal('PUT'));
const zod3 = z.union([z.literal('GET'), z.literal('POST'), z.literal('PUT')]);
const valita3 = v.union(v.literal('GET'), v.literal('POST'), v.literal('PUT'));

const paseri10 = p.union(
    p.literal('AUD'),
    p.literal('USD'),
    p.literal('EUR'),
    p.literal('GBP'),
    p.literal('JPY'),
    p.literal('CHF'),
    p.literal('CAD'),
    p.literal('NZD'),
    p.literal('SEK'),
    p.literal('NOK'),
);
const zod10 = z.union([
    z.literal('AUD'),
    z.literal('USD'),
    z.literal('EUR'),
    z.literal('GBP'),
    z.literal('JPY'),
    z.literal('CHF'),
    z.literal('CAD'),
    z.literal('NZD'),
    z.literal('SEK'),
    z.literal('NOK'),
]);
const valita10 = v.union(
    v.literal('AUD'),
    v.literal('USD'),
    v.literal('EUR'),
    v.literal('GBP'),
    v.literal('JPY'),
    v.literal('CHF'),
    v.literal('CAD'),
    v.literal('NZD'),
    v.literal('SEK'),
    v.literal('NOK'),
);

// The last member is the worst case for the pre-optimization branch scan, and a miss exercises the
// full set/scan; both are where the literal-set path should help most.
const valid3 = 'PUT';
const valid10 = 'NOK';
const invalid = 'MISSING';

bench('Paseri', { group: 'Literal union 3 (valid)', baseline: true }, () => {
    paseri3.safeParse(valid3);
});
bench('Zod', { group: 'Literal union 3 (valid)' }, () => {
    zod3.safeParse(valid3);
});
bench('Valita', { group: 'Literal union 3 (valid)' }, () => {
    valita3.try(valid3);
});

bench('Paseri', { group: 'Literal union 3 (invalid)', baseline: true }, () => {
    paseri3.safeParse(invalid);
});
bench('Zod', { group: 'Literal union 3 (invalid)' }, () => {
    zod3.safeParse(invalid);
});
bench('Valita', { group: 'Literal union 3 (invalid)' }, () => {
    valita3.try(invalid);
});

bench('Paseri', { group: 'Literal union 10 (valid)', baseline: true }, () => {
    paseri10.safeParse(valid10);
});
bench('Zod', { group: 'Literal union 10 (valid)' }, () => {
    zod10.safeParse(valid10);
});
bench('Valita', { group: 'Literal union 10 (valid)' }, () => {
    valita10.try(valid10);
});

bench('Paseri', { group: 'Literal union 10 (invalid)', baseline: true }, () => {
    paseri10.safeParse(invalid);
});
bench('Zod', { group: 'Literal union 10 (invalid)' }, () => {
    zod10.safeParse(invalid);
});
bench('Valita', { group: 'Literal union 10 (invalid)' }, () => {
    valita10.try(invalid);
});
