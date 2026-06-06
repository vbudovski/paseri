import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { map } from '../schemas/map.ts';
import { number } from '../schemas/number.ts';
import { string } from '../schemas/string.ts';
import './index.ts';

describe('map', () => {
    it('emits a map IR with no checks when bounds are default', () => {
        expect(map(string(), number()).toIR().entry).toEqual({
            kind: 'map',
            key: { kind: 'string', checks: [] },
            value: { kind: 'number', checks: [] },
            checks: [],
        });
    });

    it('emits min', () => {
        expect(map(string(), number()).min(1).toIR().entry).toEqual({
            kind: 'map',
            key: { kind: 'string', checks: [] },
            value: { kind: 'number', checks: [] },
            checks: [{ name: 'min', value: 1 }],
        });
    });

    it('emits max', () => {
        expect(map(string(), number()).max(5).toIR().entry).toEqual({
            kind: 'map',
            key: { kind: 'string', checks: [] },
            value: { kind: 'number', checks: [] },
            checks: [{ name: 'max', value: 5 }],
        });
    });
});
