import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { symbol } from '../schemas/symbol.ts';
import './index.ts';

describe('symbol', () => {
    it('emits a symbol IR', () => {
        expect(symbol().toIR()).toEqual({ entry: { kind: 'symbol' }, named: {}, cycles: [] });
    });
});
