import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { string } from '../schemas/string.ts';
import './index.ts';

describe('optional', () => {
    it('wraps the inner IR', () => {
        expect(string().optional().toIR().entry).toEqual({
            kind: 'optional',
            inner: { kind: 'string', checks: [] },
        });
    });
});
