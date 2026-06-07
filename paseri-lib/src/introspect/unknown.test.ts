import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { unknown } from '../schemas/unknown.ts';
import './index.ts';

describe('unknown', () => {
    it('emits an unknown IR', () => {
        expect(unknown().toIR()).toEqual({ entry: { kind: 'unknown' }, named: {} });
    });
});
