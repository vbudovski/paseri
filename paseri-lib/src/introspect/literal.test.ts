import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { literal } from '../schemas/literal.ts';
import './index.ts';

describe('literal', () => {
    it('emits a string literal value', () => {
        expect(literal('foo').toIR().entry).toEqual({ kind: 'literal', value: 'foo' });
    });

    it('emits a number literal value', () => {
        expect(literal(42).toIR().entry).toEqual({ kind: 'literal', value: 42 });
    });

    it('emits a boolean literal value', () => {
        expect(literal(true).toIR().entry).toEqual({ kind: 'literal', value: true });
    });

    it('emits a bigint literal value', () => {
        expect(literal(7n).toIR().entry).toEqual({ kind: 'literal', value: 7n });
    });
});
