import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { date } from '../schemas/date.ts';
import './index.ts';

describe('date', () => {
    it('emits an empty-check date IR', () => {
        expect(date().toIR()).toEqual({ entry: { kind: 'date', checks: [] }, named: {}, cycles: [] });
    });

    it('emits min with a Date value', () => {
        const low = new Date('2020-01-01');
        const ir = date().min(low).toIR().entry;
        if (ir.kind !== 'date') {
            throw new Error('expected date IR');
        }
        expect(ir.checks).toHaveLength(1);
        expect(ir.checks[0].name).toBe('min');
        expect(ir.checks[0].value.getTime()).toBe(low.getTime());
    });

    it('emits max with a Date value', () => {
        const high = new Date('2025-01-01');
        const ir = date().max(high).toIR().entry;
        if (ir.kind !== 'date') {
            throw new Error('expected date IR');
        }
        expect(ir.checks).toHaveLength(1);
        expect(ir.checks[0].name).toBe('max');
        expect(ir.checks[0].value.getTime()).toBe(high.getTime());
    });
});
