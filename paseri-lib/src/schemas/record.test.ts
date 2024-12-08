import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';
import { type TreeNode, issueCodes } from '../issue.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.record(p.number());

    fc.assert(
        fc.property(fc.object({ values: [fc.float()], maxDepth: 0 }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Record<string, number>>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid type', () => {
    const schema = p.record(p.number());

    fc.assert(
        fc.property(
            fc.anything().filter((value) => !(typeof value === 'object' && value !== null)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected Record.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Invalid elements', () => {
    const schema = p.record(p.number());
    const data = { foo: 123, bad1: 'hello', bar: 456, bad2: 'world' };

    const result = schema.safeParse(data);
    if (!result.ok) {
        expect(result.messages()).toEqual([
            { path: ['bad1'], message: 'Invalid type. Expected number.' },
            { path: ['bad2'], message: 'Invalid type. Expected number.' },
        ]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

test('Optional', () => {
    const schema = p.record(p.number()).optional();

    fc.assert(
        fc.property(fc.option(fc.object({ values: [fc.float()], maxDepth: 0 }), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Record<string, number> | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Nullable', () => {
    const schema = p.record(p.number()).nullable();

    fc.assert(
        fc.property(fc.option(fc.object({ values: [fc.float()], maxDepth: 0 }), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Record<string, number> | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
