import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { array } from '../schemas/array.ts';
import { number } from '../schemas/number.ts';
import { string } from '../schemas/string.ts';
import './index.ts';

describe('default', () => {
    it('carries the inner IR and the frozen runtime reference', () => {
        expect(string().optional().default('fallback').toIR().entry).toEqual({
            kind: 'default',
            inner: { kind: 'string', checks: [] },
            value: 'fallback',
        });
    });

    it('reuses the runtime frozen reference across invocations', () => {
        const schema = array(number()).optional().default([1, 2, 3]);
        const irA = schema.toIR().entry;
        const irB = schema.toIR().entry;
        if (irA.kind !== 'default' || irB.kind !== 'default') {
            throw new Error('expected default IR');
        }
        expect(irA.value).toBe(irB.value);
    });
});
