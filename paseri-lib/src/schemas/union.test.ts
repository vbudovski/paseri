import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.union(p.string(), p.number(), p.literal(123n));

    fc.assert(
        fc.property(fc.oneof(fc.string(), fc.float(), fc.constant(123n)), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string | number | 123n>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid type', () => {
    const schema = p.union(p.string(), p.number(), p.literal(123n));

    fc.assert(
        fc.property(
            fc
                .anything()
                .filter((value) => !(typeof value === 'string' || typeof value === 'number' || value === 123n)),
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
    const schema = p.union(p.string(), p.number(), p.literal(123n)).optional();

    fc.assert(
        fc.property(fc.option(fc.oneof(fc.string(), fc.float(), fc.constant(123n)), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string | number | 123n | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Nullable', () => {
    const schema = p.union(p.string(), p.number(), p.literal(123n)).nullable();

    fc.assert(
        fc.property(fc.option(fc.oneof(fc.string(), fc.float(), fc.constant(123n)), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string | number | 123n | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
