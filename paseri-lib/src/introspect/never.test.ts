import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { never } from '../schemas/never.ts';
import './index.ts';

describe('never', () => {
    it('emits a never IR', () => {
        expect(never().toIR()).toEqual({ entry: { kind: 'never' }, named: {} });
    });
});
