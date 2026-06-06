import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { undefined_ } from '../schemas/undefined.ts';
import './index.ts';

describe('undefined', () => {
    it('emits an undefined IR', () => {
        expect(undefined_().toIR()).toEqual({ entry: { kind: 'undefined' }, named: {} });
    });
});
