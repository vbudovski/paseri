import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts null', () => {
    const schema = p.null();
    const result = schema.safeParse(null);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<null>;
        expect(result.value).toBe(null);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('rejects non-null values', () => {
    const schema = p.null();

    fc.assert(
        fc.property(
            fc.anything().filter((value) => value !== null),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_value' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

it('accepts optional values', () => {
    const schema = p.optional(p.null());

    fc.assert(
        fc.property(fc.option(fc.constant(null), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<null | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.nullable(p.null());

    fc.assert(
        fc.property(fc.option(fc.constant(null), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
