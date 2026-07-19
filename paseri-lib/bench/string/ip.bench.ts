import { z } from 'zod';
import * as p from '../../src/index.ts';

const { bench } = Deno;

const paseriSchema = p.string().ip();
const zodSchema = z.ipv4().or(z.ipv6());

const dataValid = '192.168.1.254';
const dataInvalid = '999';
const dataValidV6 = '2001:db8:85a3::8a2e:370:7334';
const dataValidV6ZoneId = 'fe80::1%eth0';

bench('Paseri', { group: 'IP valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValid);
});

bench('Zod', { group: 'IP valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('Paseri', { group: 'IP invalid', baseline: true }, () => {
    paseriSchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'IP invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});

bench('Paseri', { group: 'IP v6 valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValidV6);
});

bench('Zod', { group: 'IP v6 valid' }, () => {
    zodSchema.safeParse(dataValidV6);
});

// No Zod row: Zod's ipv6 has no zone ID support, so it would bench a rejection under a 'valid' label.
bench('Paseri', { group: 'IP v6 zone ID valid', baseline: true }, () => {
    paseriSchema.safeParse(dataValidV6ZoneId);
});
