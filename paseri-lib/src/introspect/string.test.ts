import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import {
    dateRegex,
    datetimeRegex,
    emailRegex,
    emojiRegex,
    ipCidrRegex,
    ipRegex,
    nanoidRegex,
    timeRegex,
    uuidRegex,
} from '../schemas/regex.gen.ts';
import { string } from '../schemas/string.ts';
import './index.ts';

describe('string', () => {
    it('emits an empty-check string IR', () => {
        expect(string().toIR()).toEqual({ entry: { kind: 'string', checks: [] }, named: {}, cycles: [] });
    });

    it('emits min', () => {
        expect(string().min(3).toIR().entry).toEqual({
            kind: 'string',
            checks: [{ name: 'min', value: 3 }],
        });
    });

    it('emits max', () => {
        expect(string().max(10).toIR().entry).toEqual({
            kind: 'string',
            checks: [{ name: 'max', value: 10 }],
        });
    });

    it('emits includes', () => {
        expect(string().includes('foo').toIR().entry).toEqual({
            kind: 'string',
            checks: [{ name: 'includes', value: 'foo' }],
        });
    });

    it('emits startsWith', () => {
        expect(string().startsWith('a').toIR().entry).toEqual({
            kind: 'string',
            checks: [{ name: 'startsWith', value: 'a' }],
        });
    });

    it('emits endsWith', () => {
        expect(string().endsWith('z').toIR().entry).toEqual({
            kind: 'string',
            checks: [{ name: 'endsWith', value: 'z' }],
        });
    });

    it('emits email as a named regex check', () => {
        const regex = emailRegex();
        expect(string().email().toIR().entry).toEqual({
            kind: 'string',
            checks: [{ name: 'email', source: regex.source, flags: regex.flags }],
        });
    });

    it('emits emoji as a named regex check', () => {
        const regex = emojiRegex();
        expect(string().emoji().toIR().entry).toEqual({
            kind: 'string',
            checks: [{ name: 'emoji', source: regex.source, flags: regex.flags }],
        });
    });

    it('emits uuid as a named regex check', () => {
        const regex = uuidRegex();
        expect(string().uuid().toIR().entry).toEqual({
            kind: 'string',
            checks: [{ name: 'uuid', source: regex.source, flags: regex.flags }],
        });
    });

    it('emits nanoid as a named regex check', () => {
        const regex = nanoidRegex();
        expect(string().nanoid().toIR().entry).toEqual({
            kind: 'string',
            checks: [{ name: 'nanoid', source: regex.source, flags: regex.flags }],
        });
    });

    it('emits date as a named regex check', () => {
        const regex = dateRegex();
        expect(string().date().toIR().entry).toEqual({
            kind: 'string',
            checks: [{ name: 'date', source: regex.source, flags: regex.flags }],
        });
    });

    it('emits time as a named regex check', () => {
        const regex = timeRegex();
        expect(string().time().toIR().entry).toEqual({
            kind: 'string',
            checks: [{ name: 'time', source: regex.source, flags: regex.flags }],
        });
    });

    it('emits datetime as a named regex check', () => {
        const regex = datetimeRegex();
        expect(string().datetime().toIR().entry).toEqual({
            kind: 'string',
            checks: [{ name: 'datetime', source: regex.source, flags: regex.flags }],
        });
    });

    it('emits ip as a named regex check', () => {
        const regex = ipRegex();
        expect(string().ip().toIR().entry).toEqual({
            kind: 'string',
            checks: [{ name: 'ip', source: regex.source, flags: regex.flags }],
        });
    });

    it('emits cidr as a named regex check', () => {
        const regex = ipCidrRegex();
        expect(string().cidr().toIR().entry).toEqual({
            kind: 'string',
            checks: [{ name: 'cidr', source: regex.source, flags: regex.flags }],
        });
    });

    it('emits a user-supplied regex check as `regex` with the original source', () => {
        const result = string().regex(/^\d+$/u).toIR();
        expect(result.entry).toEqual({
            kind: 'string',
            checks: [{ name: 'regex', source: '^\\d+$', flags: 'u' }],
        });
    });

    it('emits two checks for length() (max + min)', () => {
        expect(string().length(5).toIR().entry).toEqual({
            kind: 'string',
            checks: [
                { name: 'max', value: 5 },
                { name: 'min', value: 5 },
            ],
        });
    });
});
