import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { number } from '../schemas/number.ts';
import './index.ts';

describe('number', () => {
    it('emits an empty-check number IR', () => {
        expect(number().toIR()).toEqual({ entry: { kind: 'number', checks: [] }, named: {}, cycles: [] });
    });

    it('emits gte', () => {
        expect(number().gte(0).toIR().entry).toEqual({
            kind: 'number',
            checks: [{ name: 'gte', value: 0 }],
        });
    });

    it('emits gt', () => {
        expect(number().gt(1).toIR().entry).toEqual({
            kind: 'number',
            checks: [{ name: 'gt', value: 1 }],
        });
    });

    it('emits lte', () => {
        expect(number().lte(10).toIR().entry).toEqual({
            kind: 'number',
            checks: [{ name: 'lte', value: 10 }],
        });
    });

    it('emits lt', () => {
        expect(number().lt(11).toIR().entry).toEqual({
            kind: 'number',
            checks: [{ name: 'lt', value: 11 }],
        });
    });

    it('emits int', () => {
        expect(number().int().toIR().entry).toEqual({
            kind: 'number',
            checks: [{ name: 'int' }],
        });
    });

    it('emits finite', () => {
        expect(number().finite().toIR().entry).toEqual({
            kind: 'number',
            checks: [{ name: 'finite' }],
        });
    });

    it('emits safe', () => {
        expect(number().safe().toIR().entry).toEqual({
            kind: 'number',
            checks: [{ name: 'safe' }],
        });
    });
});
