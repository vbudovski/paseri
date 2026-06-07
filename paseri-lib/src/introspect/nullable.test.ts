import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { string } from '../schemas/string.ts';
import './index.ts';

describe('nullable', () => {
    it('wraps the inner IR', () => {
        expect(string().nullable().toIR().entry).toEqual({
            kind: 'nullable',
            inner: { kind: 'string', checks: [] },
        });
    });
});
