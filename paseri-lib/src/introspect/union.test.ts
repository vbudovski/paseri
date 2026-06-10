import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { literal } from '../schemas/literal.ts';
import { number } from '../schemas/number.ts';
import { object } from '../schemas/object.ts';
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

    it('records the discriminator key the runtime selected', () => {
        const schema = union(
            object({ kind: literal('circle'), radius: number() }),
            object({ kind: literal('square'), side: number() }),
        );
        const entry = schema.toIR().entry;
        if (entry.kind !== 'union') {
            throw new Error('expected union IR');
        }
        expect(entry.discriminator).toBe('kind');
    });

    it('omits the discriminator when the union has none', () => {
        const entry = union(string(), number()).toIR().entry;
        if (entry.kind !== 'union') {
            throw new Error('expected union IR');
        }
        expect('discriminator' in entry).toBe(false);
    });
});
