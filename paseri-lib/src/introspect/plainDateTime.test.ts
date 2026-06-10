import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { plainDateTime } from '../schemas/plainDateTime.ts';
import './index.ts';

describe('plainDateTime', () => {
    it('emits an empty-check plainDateTime IR', () => {
        expect(plainDateTime().toIR()).toEqual({ entry: { kind: 'plainDateTime', checks: [] }, named: {}, cycles: [] });
    });

    it('emits min with a Temporal.PlainDateTime value', () => {
        const low = Temporal.PlainDateTime.from('2020-01-01T00:00');
        const ir = plainDateTime().min(low).toIR().entry;
        if (ir.kind !== 'plainDateTime') {
            throw new Error('expected plainDateTime IR');
        }
        expect(ir.checks).toHaveLength(1);
        expect(ir.checks[0].name).toBe('min');
        expect(Temporal.PlainDateTime.compare(ir.checks[0].value, low)).toBe(0);
    });

    it('emits max with a Temporal.PlainDateTime value', () => {
        const high = Temporal.PlainDateTime.from('2025-01-01T00:00');
        const ir = plainDateTime().max(high).toIR().entry;
        if (ir.kind !== 'plainDateTime') {
            throw new Error('expected plainDateTime IR');
        }
        expect(ir.checks).toHaveLength(1);
        expect(ir.checks[0].name).toBe('max');
        expect(Temporal.PlainDateTime.compare(ir.checks[0].value, high)).toBe(0);
    });
});
