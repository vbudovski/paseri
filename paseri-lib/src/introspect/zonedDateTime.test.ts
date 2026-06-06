import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { zonedDateTime } from '../schemas/zonedDateTime.ts';
import './index.ts';

describe('zonedDateTime', () => {
    it('emits an empty-check zonedDateTime IR', () => {
        expect(zonedDateTime().toIR()).toEqual({ entry: { kind: 'zonedDateTime', checks: [] }, named: {} });
    });

    it('emits min with a Temporal.ZonedDateTime value', () => {
        const low = Temporal.ZonedDateTime.from('2020-01-01T00:00[UTC]');
        const ir = zonedDateTime().min(low).toIR().entry;
        if (ir.kind !== 'zonedDateTime') {
            throw new Error('expected zonedDateTime IR');
        }
        expect(ir.checks).toHaveLength(1);
        expect(ir.checks[0].name).toBe('min');
        expect(Temporal.ZonedDateTime.compare(ir.checks[0].value, low)).toBe(0);
    });

    it('emits max with a Temporal.ZonedDateTime value', () => {
        const high = Temporal.ZonedDateTime.from('2025-01-01T00:00[UTC]');
        const ir = zonedDateTime().max(high).toIR().entry;
        if (ir.kind !== 'zonedDateTime') {
            throw new Error('expected zonedDateTime IR');
        }
        expect(ir.checks).toHaveLength(1);
        expect(ir.checks[0].name).toBe('max');
        expect(Temporal.ZonedDateTime.compare(ir.checks[0].value, high)).toBe(0);
    });
});
