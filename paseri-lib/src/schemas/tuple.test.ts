import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';
import { type TreeNode, issueCodes } from '../issue.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n));

    fc.assert(
        fc.property(fc.tuple(fc.float(), fc.string(), fc.constant(123n)), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<[number, string, 123n]>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid type', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n));

    fc.assert(
        fc.property(
            fc.anything().filter((value) => !Array.isArray(value)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected array.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Too long', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n));
    const data = [1, 'foo', 123n, 'bad'];

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'Too long.' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Too short', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n));
    const data = [1, 'foo'];

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'Too short.' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Invalid elements', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n), p.number());
    const data = [123, 666, 123n, 'foo'];

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([
            { path: [1], message: 'Invalid type. Expected string.' },
            { path: [3], message: 'Invalid type. Expected number.' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Optional', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n)).optional();

    fc.assert(
        fc.property(fc.option(fc.tuple(fc.float(), fc.string(), fc.constant(123n)), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<[number, string, 123n] | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Nullable', () => {
    const schema = p.tuple(p.number(), p.string(), p.literal(123n)).nullable();

    fc.assert(
        fc.property(fc.option(fc.tuple(fc.float(), fc.string(), fc.constant(123n)), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<[number, string, 123n] | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
