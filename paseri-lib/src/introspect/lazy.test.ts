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
    });
});
