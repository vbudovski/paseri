import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('Valid type', () => {
    type T = string | T[];
    const schema: p.Schema<T> = p.lazy(() => p.union(p.string(), p.array(schema)));

    const { tree } = fc.letrec((tie) => ({
        tree: fc.oneof({ depthSize: 'small', withCrossShrink: true }, tie('leaf'), tie('node')),
        node: fc.array(tie('tree')),
        leaf: fc.string(),
    }));

    fc.assert(
        fc.property(tree, (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<T>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid type', () => {
    type T = string | T[];
    const schema: p.Schema<T> = p.lazy(() => p.union(p.string(), p.array(schema)));

    const { tree } = fc.letrec((tie) => ({
        tree: fc.oneof({ depthSize: 'small', withCrossShrink: true }, tie('leaf'), tie('node')),
        node: fc.array(tie('tree'), { minLength: 1 }),
        leaf: fc.anything().filter((value) => !(typeof value === 'string' || Array.isArray(value))),
    }));

    fc.assert(
        fc.property(tree, (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_value' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});
