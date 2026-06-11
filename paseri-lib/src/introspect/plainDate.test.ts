import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { plainDate } from '../schemas/plainDate.ts';
import './index.ts';

describe('plainDate', () => {
    it('emits an empty-check plainDate IR', () => {
        expect(plainDate().toIR()).toEqual({ entry: { kind: 'plainDate', checks: [] }, named: {}, cycles: [] });
    });

    it('emits min with a Temporal.PlainDate value', () => {
        const low = Temporal.PlainDate.from('2020-01-01');
        const ir = plainDate().min(low).toIR().entry;
        if (ir.kind !== 'plainDate') {
            throw new Error('expected plainDate IR');
        }
        expect(ir.checks).toHaveLength(1);
        expect(ir.checks[0].name).toBe('min');
        expect(Temporal.PlainDate.compare(ir.checks[0].value, low)).toBe(0);
    });

    it('emits max with a Temporal.PlainDate value', () => {
        const high = Temporal.PlainDate.from('2025-01-01');
        const ir = plainDate().max(high).toIR().entry;
        if (ir.kind !== 'plainDate') {
            throw new Error('expected plainDate IR');
        }
        expect(ir.checks).toHaveLength(1);
        expect(ir.checks[0].name).toBe('max');
        expect(Temporal.PlainDate.compare(ir.checks[0].value, high)).toBe(0);
    });
});
