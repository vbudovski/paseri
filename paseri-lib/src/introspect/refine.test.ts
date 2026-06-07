import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { number } from '../schemas/number.ts';
import './index.ts';

describe('refine', () => {
    it('emits a refine node wrapping the base IR', () => {
        const schema = number().refine((n) => n > 0, { code: 'positive' });
        const graph = schema.toIR();
        expect(graph.entry).toEqual({
            kind: 'refine',
            inner: { kind: 'number', checks: [] },
            callback: {
                source: expect.any(String),
                name: expect.any(String),
                arity: 1,
                parameterNames: ['n'],
                freeIdentifiers: [],
                callSiteFile: expect.stringContaining('refine.test.ts'),
            },
            code: 'positive',
            path: [],
        });
    });

    it('propagates path and params options', () => {
        const schema = number().refine((n) => n > 0, {
            code: 'positive',
            path: ['nested', 'key'],
            params: { min: 0 },
        });
        const graph = schema.toIR();
        expect(graph.entry).toMatchObject({
            kind: 'refine',
            code: 'positive',
            path: ['nested', 'key'],
            params: { min: 0 },
        });
    });

    it('captures free identifiers when the predicate closes over a binding', () => {
        const limit = 5;
        const schema = number().refine((n) => n > limit, { code: 'gt_limit' });
        const graph = schema.toIR();
        expect(graph.entry).toMatchObject({
            kind: 'refine',
            callback: { freeIdentifiers: ['limit'] },
        });
    });

    it('falls back to an unsupported node for native predicates', () => {
        const schema = number().refine(Number.isFinite, { code: 'finite' });
        const graph = schema.toIR();
        expect(graph.entry).toEqual({
            kind: 'unsupported',
            schema: 'refine',
            reason: expect.any(String),
        });
    });
});
