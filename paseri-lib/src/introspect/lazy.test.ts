import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { lazy } from '../schemas/lazy.ts';
import { number } from '../schemas/number.ts';
import { object } from '../schemas/object.ts';
import type { Schema } from '../schemas/schema.ts';
import { string } from '../schemas/string.ts';
import './index.ts';

describe('lazy', () => {
    it('emits a ref node and stores the resolved IR under named', () => {
        const inner = string();
        expect(lazy(() => inner).toIR()).toEqual({
            entry: { kind: 'ref', name: '_lazy_0' },
            named: { _lazy_0: { kind: 'string', checks: [] } },
            cycles: [],
        });
    });

    it('reuses the same ref name when the same lazy resolves to the same target', () => {
        const inner = string();
        const lazyInner = lazy(() => inner);
        const schema = object({ a: lazyInner, b: lazyInner });
        const result = schema.toIR();
        const entry = result.entry;
        if (entry.kind !== 'object') {
            throw new Error('expected object IR');
        }
        expect(entry.fields.a).toEqual({ kind: 'ref', name: '_lazy_0' });
        expect(entry.fields.b).toEqual({ kind: 'ref', name: '_lazy_0' });
        expect(Object.keys(result.named)).toEqual(['_lazy_0']);
        // Sharing after emission completes is a forward reference, not a cycle.
        expect(result.cycles).toEqual([]);
    });

    it('handles a self-referential schema without infinite recursion', () => {
        interface Tree {
            value: number;
            next: Tree | null;
        }
        let treeSchema: Schema<Tree>;
        treeSchema = object({
            value: number(),
            next: lazy<Tree | null>(() => treeSchema).nullable(),
        }) as unknown as Schema<Tree>;

        const result = treeSchema.toIR();
        const entry = result.entry;
        if (entry.kind !== 'object') {
            throw new Error('expected object IR');
        }
        const nextIR = entry.fields.next;
        if (nextIR.kind !== 'nullable') {
            throw new Error('expected nullable IR');
        }
        expect(nextIR.inner.kind).toBe('ref');
        const refName = (nextIR.inner as { kind: 'ref'; name: string }).name;
        expect(result.named).toHaveProperty(refName);
        expect(result.cycles).toEqual([refName]);
    });

    it('records only the re-entered name for a mutual cycle, leaving the adjacent target acyclic', () => {
        interface Ping {
            pong: Pong | null;
        }
        interface Pong {
            ping: Ping | null;
        }
        let pingSchema: Schema<Ping>;
        const pongSchema: Schema<Pong> = object({
            ping: lazy<Ping | null>(() => pingSchema).nullable(),
        }) as unknown as Schema<Pong>;
        pingSchema = object({
            pong: lazy<Pong | null>(() => pongSchema).nullable(),
        }) as unknown as Schema<Ping>;

        const result = pingSchema.toIR();
        // Emission enters pong's target first, reaches ping's target, and re-enters pong's target — only the
        // re-entered name is cyclic; the inner target terminates and can be inlined by consumers.
        expect(result.cycles.length).toBe(1);
        expect(Object.keys(result.named).length).toBe(2);
        expect(result.named).toHaveProperty(result.cycles[0]);
    });
});
