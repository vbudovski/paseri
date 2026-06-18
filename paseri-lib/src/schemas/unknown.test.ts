import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts all values', () => {
    const schema = p.unknown();

    fc.assert(
        fc.property(fc.anything(), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<unknown>();
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('infers as unknown', () => {
    const schema = p.unknown();
    const objectSchema = p.object({ value: p.unknown() });

    expectTypeOf<p.Infer<typeof schema>>().toEqualTypeOf<unknown>();
    expectTypeOf<p.Infer<typeof objectSchema>>().toEqualTypeOf<{ value: unknown }>();
});
