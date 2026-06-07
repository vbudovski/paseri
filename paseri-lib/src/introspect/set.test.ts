import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { set } from '../schemas/set.ts';
import { string } from '../schemas/string.ts';
import './index.ts';

describe('set', () => {
    it('emits a set IR with no checks when bounds are default', () => {
        expect(set(string()).toIR().entry).toEqual({
            kind: 'set',
            element: { kind: 'string', checks: [] },
            checks: [],
        });
    });

    it('emits min', () => {
        expect(set(string()).min(1).toIR().entry).toEqual({
            kind: 'set',
            element: { kind: 'string', checks: [] },
            checks: [{ name: 'min', value: 1 }],
        });
    });

    it('emits max', () => {
        expect(set(string()).max(5).toIR().entry).toEqual({
            kind: 'set',
            element: { kind: 'string', checks: [] },
            checks: [{ name: 'max', value: 5 }],
        });
    });
});
