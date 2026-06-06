import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import type { ParseResult } from '../result.ts';
import { number } from '../schemas/number.ts';
import { string } from '../schemas/string.ts';
import './index.ts';

describe('chain', () => {
    it('emits a chain node with from/to IR and a serialised transformer', () => {
        const schema = string().chain(number(), (value) => ({ ok: true, value: value.length }));
        const graph = schema.toIR();
        expect(graph.entry).toEqual({
            kind: 'chain',
            from: { kind: 'string', checks: [] },
            to: { kind: 'number', checks: [] },
            callback: {
                source: expect.any(String),
                name: expect.any(String),
                arity: 1,
                parameterNames: ['value'],
                freeIdentifiers: [],
                callSiteFile: expect.stringContaining('chain.test.ts'),
            },
        });
    });

    it('captures free identifiers when the transformer closes over a binding', () => {
        const offset = 3;
        const schema = string().chain(number(), (value) => ({ ok: true, value: value.length + offset }));
        const graph = schema.toIR();
        expect(graph.entry).toMatchObject({
            kind: 'chain',
            callback: { freeIdentifiers: ['offset'] },
        });
    });

    it('falls back to an unsupported node for native transformers', () => {
        const bound = ((value: string): ParseResult<number> => ({ ok: true, value: value.length })).bind(null);
        const schema = string().chain(number(), bound);
        const graph = schema.toIR();
        expect(graph.entry).toEqual({
            kind: 'unsupported',
            schema: 'chain',
            reason: expect.any(String),
        });
    });
});
