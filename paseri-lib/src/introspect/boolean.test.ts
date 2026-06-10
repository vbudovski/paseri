import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { boolean } from '../schemas/boolean.ts';
import './index.ts';

describe('boolean', () => {
    it('emits a boolean IR', () => {
        expect(boolean().toIR()).toEqual({ entry: { kind: 'boolean' }, named: {}, cycles: [] });
    });
});
