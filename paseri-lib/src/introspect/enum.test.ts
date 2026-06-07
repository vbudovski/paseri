import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { enum_ } from '../schemas/enum.ts';
import './index.ts';

describe('enum', () => {
    it('emits the value set', () => {
        expect(enum_('a', 'b', 'c').toIR().entry).toEqual({ kind: 'enum', values: ['a', 'b', 'c'] });
    });
});
