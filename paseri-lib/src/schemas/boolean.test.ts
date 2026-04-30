import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts valid types', () => {
    const schema = p.boolean();

    fc.assert(
        fc.property(fc.boolean(), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<boolean>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.boolean();

    fc.assert(
        fc.property(
            fc.anything().filter((value) => typeof value !== 'boolean'),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_type' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

it('accepts optional values', () => {
    const schema = p.optional(p.boolean());

    fc.assert(
        fc.property(fc.option(fc.boolean(), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<boolean | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.nullable(p.boolean());

    fc.assert(
        fc.property(fc.option(fc.boolean(), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<boolean | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
