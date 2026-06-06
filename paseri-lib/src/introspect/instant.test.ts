import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { instant } from '../schemas/instant.ts';
import './index.ts';

describe('instant', () => {
    it('emits an empty-check instant IR', () => {
        expect(instant().toIR()).toEqual({ entry: { kind: 'instant', checks: [] }, named: {} });
    });

    it('emits min with a Temporal.Instant value', () => {
        const low = Temporal.Instant.from('2020-01-01T00:00:00Z');
        const ir = instant().min(low).toIR().entry;
        if (ir.kind !== 'instant') {
            throw new Error('expected instant IR');
        }
        expect(ir.checks).toHaveLength(1);
        expect(ir.checks[0].name).toBe('min');
        expect(Temporal.Instant.compare(ir.checks[0].value, low)).toBe(0);
    });

    it('emits max with a Temporal.Instant value', () => {
        const high = Temporal.Instant.from('2025-01-01T00:00:00Z');
        const ir = instant().max(high).toIR().entry;
        if (ir.kind !== 'instant') {
            throw new Error('expected instant IR');
        }
        expect(ir.checks).toHaveLength(1);
        expect(ir.checks[0].name).toBe('max');
        expect(Temporal.Instant.compare(ir.checks[0].value, high)).toBe(0);
    });
});
