import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts undefined', () => {
    const schema = p.undefined();
    const result = schema.safeParse(undefined);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<undefined>;
        expect(result.value).toBe(undefined);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('rejects non-undefined values', () => {
    const schema = p.undefined();

    fc.assert(
        fc.property(
            fc.anything().filter((value) => value !== undefined),
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
    const schema = p.optional(p.undefined());

    fc.assert(
        fc.property(fc.option(fc.constant(undefined), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.nullable(p.undefined());

    fc.assert(
        fc.property(fc.option(fc.constant(undefined), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<undefined | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
