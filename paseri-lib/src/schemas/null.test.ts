import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('Valid value', () => {
    const schema = p.null();
    const result = schema.safeParse(null);
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<null>;
        expect(result.value).toBe(null);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

test('Invalid value', () => {
    const schema = p.null();

    fc.assert(
        fc.property(
            fc.anything().filter((value) => value !== null),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_value' });
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Optional', () => {
    const schema = p.null().optional();

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

test('Nullable', () => {
    const schema = p.null().nullable();

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
