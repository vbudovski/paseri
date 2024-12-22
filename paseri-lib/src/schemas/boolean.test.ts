import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('Valid type', () => {
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

test('Invalid type', () => {
    const schema = p.boolean();

    fc.assert(
        fc.property(
            fc.anything().filter((value) => typeof value !== 'boolean'),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected boolean.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Optional', () => {
    const schema = p.boolean().optional();

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

test('Nullable', () => {
    const schema = p.boolean().nullable();

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
