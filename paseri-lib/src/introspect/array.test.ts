import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { array } from '../schemas/array.ts';
import { string } from '../schemas/string.ts';
import './index.ts';

describe('array', () => {
    it('emits an array IR with no checks when bounds are default', () => {
        expect(array(string()).toIR().entry).toEqual({
            kind: 'array',
            element: { kind: 'string', checks: [] },
            checks: [],
        });
    });

    it('emits min', () => {
        expect(array(string()).min(1).toIR().entry).toEqual({
            kind: 'array',
            element: { kind: 'string', checks: [] },
            checks: [{ name: 'min', value: 1 }],
        });
    });

    it('emits max', () => {
        expect(array(string()).max(10).toIR().entry).toEqual({
            kind: 'array',
            element: { kind: 'string', checks: [] },
            checks: [{ name: 'max', value: 10 }],
        });
    });

    it('emits two checks for length() (min + max)', () => {
        expect(array(string()).length(5).toIR().entry).toEqual({
            kind: 'array',
            element: { kind: 'string', checks: [] },
            checks: [
                { name: 'min', value: 5 },
                { name: 'max', value: 5 },
            ],
        });
    });
});
