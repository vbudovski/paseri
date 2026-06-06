import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { plainMonthDay } from '../schemas/plainMonthDay.ts';
import './index.ts';

describe('plainMonthDay', () => {
    it('emits a plainMonthDay IR', () => {
        expect(plainMonthDay().toIR()).toEqual({ entry: { kind: 'plainMonthDay' }, named: {} });
    });
});
