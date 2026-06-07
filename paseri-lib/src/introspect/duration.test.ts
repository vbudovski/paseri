import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { duration } from '../schemas/duration.ts';
import './index.ts';

describe('duration', () => {
    it('emits a duration IR', () => {
        expect(duration().toIR()).toEqual({ entry: { kind: 'duration' }, named: {} });
    });
});
