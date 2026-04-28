import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import fc from 'fast-check';
import * as p from '../index.ts';

it('rejects all values', () => {
    const schema = p.never();

    fc.assert(
        fc.property(fc.anything(), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'invalid_type' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});
