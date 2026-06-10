import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { bigint } from '../schemas/bigint.ts';
import './index.ts';

describe('bigint', () => {
    it('emits an empty-check bigint IR', () => {
        expect(bigint().toIR()).toEqual({ entry: { kind: 'bigint', checks: [] }, named: {}, cycles: [] });
    });

    it('emits gte', () => {
        expect(bigint().gte(0n).toIR().entry).toEqual({
            kind: 'bigint',
            checks: [{ name: 'gte', value: 0n }],
        });
    });

    it('emits gt', () => {
        expect(bigint().gt(1n).toIR().entry).toEqual({
            kind: 'bigint',
            checks: [{ name: 'gt', value: 1n }],
        });
    });

    it('emits lte', () => {
        expect(bigint().lte(10n).toIR().entry).toEqual({
            kind: 'bigint',
            checks: [{ name: 'lte', value: 10n }],
        });
    });

    it('emits lt', () => {
        expect(bigint().lt(11n).toIR().entry).toEqual({
            kind: 'bigint',
            checks: [{ name: 'lt', value: 11n }],
        });
    });
});
