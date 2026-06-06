import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { null_ } from '../schemas/null.ts';
import './index.ts';

describe('null', () => {
    it('emits a null IR', () => {
        expect(null_().toIR()).toEqual({ entry: { kind: 'null' }, named: {} });
    });
});
