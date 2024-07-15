import { expect } from '@std/expect';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('Everything fails', () => {
    const schema = p.never();

    fc.assert(
        fc.property(fc.anything(), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_type' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});
