import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { number } from '../schemas/number.ts';
import { string } from '../schemas/string.ts';
import { tuple } from '../schemas/tuple.ts';
import './index.ts';

describe('tuple', () => {
    it('emits each element schema in order', () => {
        expect(tuple(string(), number(), string()).toIR().entry).toEqual({
            kind: 'tuple',
            elements: [
                { kind: 'string', checks: [] },
                { kind: 'number', checks: [] },
                { kind: 'string', checks: [] },
            ],
        });
    });
});
