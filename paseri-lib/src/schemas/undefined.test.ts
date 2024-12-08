import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('Valid value', () => {
    const schema = p.undefined();
    const result = schema.safeParse(undefined);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<undefined>;
        expect(result.value).toBe(undefined);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Invalid value', () => {
    const schema = p.undefined();

    fc.assert(
        fc.property(
            fc.anything().filter((value) => value !== undefined),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid value. Expected undefined.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Optional', () => {
    const schema = p.undefined().optional();

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

test('Nullable', () => {
    const schema = p.undefined().nullable();

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
