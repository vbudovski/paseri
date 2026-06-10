import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { plainYearMonth } from '../schemas/plainYearMonth.ts';
import './index.ts';

describe('plainYearMonth', () => {
    it('emits an empty-check plainYearMonth IR', () => {
        expect(plainYearMonth().toIR()).toEqual({
            entry: { kind: 'plainYearMonth', checks: [] },
            named: {},
            cycles: [],
        });
    });

    it('emits min with a Temporal.PlainYearMonth value', () => {
        const low = Temporal.PlainYearMonth.from('2020-01');
        const ir = plainYearMonth().min(low).toIR().entry;
        if (ir.kind !== 'plainYearMonth') {
            throw new Error('expected plainYearMonth IR');
        }
        expect(ir.checks).toHaveLength(1);
        expect(ir.checks[0].name).toBe('min');
        expect(Temporal.PlainYearMonth.compare(ir.checks[0].value, low)).toBe(0);
    });

    it('emits max with a Temporal.PlainYearMonth value', () => {
        const high = Temporal.PlainYearMonth.from('2025-01');
        const ir = plainYearMonth().max(high).toIR().entry;
        if (ir.kind !== 'plainYearMonth') {
            throw new Error('expected plainYearMonth IR');
        }
        expect(ir.checks).toHaveLength(1);
        expect(ir.checks[0].name).toBe('max');
        expect(Temporal.PlainYearMonth.compare(ir.checks[0].value, high)).toBe(0);
    });
});
