import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { plainTime } from '../schemas/plainTime.ts';
import './index.ts';

describe('plainTime', () => {
    it('emits an empty-check plainTime IR', () => {
        expect(plainTime().toIR()).toEqual({ entry: { kind: 'plainTime', checks: [] }, named: {} });
    });

    it('emits min with a Temporal.PlainTime value', () => {
        const low = Temporal.PlainTime.from('00:00');
        const ir = plainTime().min(low).toIR().entry;
        if (ir.kind !== 'plainTime') {
            throw new Error('expected plainTime IR');
        }
        expect(ir.checks).toHaveLength(1);
        expect(ir.checks[0].name).toBe('min');
        expect(Temporal.PlainTime.compare(ir.checks[0].value, low)).toBe(0);
    });

    it('emits max with a Temporal.PlainTime value', () => {
        const high = Temporal.PlainTime.from('23:59');
        const ir = plainTime().max(high).toIR().entry;
        if (ir.kind !== 'plainTime') {
            throw new Error('expected plainTime IR');
        }
        expect(ir.checks).toHaveLength(1);
        expect(ir.checks[0].name).toBe('max');
        expect(Temporal.PlainTime.compare(ir.checks[0].value, high)).toBe(0);
    });
});
