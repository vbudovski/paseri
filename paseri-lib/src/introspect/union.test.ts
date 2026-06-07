import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { number } from '../schemas/number.ts';
import { string } from '../schemas/string.ts';
import { union } from '../schemas/union.ts';
import './index.ts';

describe('union', () => {
    it('emits each member', () => {
        expect(union(string(), number()).toIR().entry).toEqual({
            kind: 'union',
            members: [
                { kind: 'string', checks: [] },
                { kind: 'number', checks: [] },
            ],
        });
    });
});
