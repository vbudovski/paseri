import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { number } from '../schemas/number.ts';
import { record } from '../schemas/record.ts';
import './index.ts';

describe('record', () => {
    it('emits a record IR with the element schema', () => {
        expect(record(number()).toIR().entry).toEqual({
            kind: 'record',
            element: { kind: 'number', checks: [] },
        });
    });
});
