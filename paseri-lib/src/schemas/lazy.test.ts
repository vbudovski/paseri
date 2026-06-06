import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';
import type { Message } from '../issue.ts';

type Node = { children: Node[] };

function buildChain(depth: number): Node {
    let node: Node = { children: [] };
    for (let i = 0; i < depth - 1; i++) {
        node = { children: [node] };
    }
    return node;
}

it('accepts valid types', () => {
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

it('rejects invalid types', () => {
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

            function makeExpectedMessages(d: unknown, path: number[] = []): Message[] {
                if (Array.isArray(d)) {
                    return [
                        { path, message: 'invalid_type' },
                        ...d.flatMap((di, i) => makeExpectedMessages(di, [...path, i])),
                    ];
                }

                return [
                    { path, message: 'invalid_type' },
                    { path, message: 'invalid_type' },
                ];
            }

            if (!result.ok) {
                expect(result.messages()).toEqual(makeExpectedMessages(data));
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

describe('maxDepth', () => {
    it('rejects data deeper than the default maxDepth', () => {
        const schema: p.Schema<Node> = p.lazy(() => p.object({ children: p.array(schema) }));

        const result = schema.safeParse(buildChain(1001));
        if (!result.ok) {
            const messages = result.messages();
            expect(messages.length).toBe(1);
            expect(messages[0].message).toBe('too_deep');
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('honours a custom maxDepth passed to safeParse', () => {
        const schema: p.Schema<Node> = p.lazy(() => p.object({ children: p.array(schema) }));

        const input = buildChain(5);
        const accepted = schema.safeParse(input, { maxDepth: 5 });
        if (accepted.ok) {
            expect(accepted.value).toBe(input);
        } else {
            expect(accepted.ok).toBeTruthy();
        }

        const result = schema.safeParse(buildChain(6), { maxDepth: 5 });
        if (!result.ok) {
            const messages = result.messages();
            expect(messages.length).toBe(1);
            expect(messages[0].message).toBe('too_deep');
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('lets the same schema use different maxDepth values across calls', () => {
        const schema: p.Schema<Node> = p.lazy(() => p.object({ children: p.array(schema) }));

        const rejected = schema.safeParse(buildChain(11), { maxDepth: 10 });
        if (!rejected.ok) {
            const messages = rejected.messages();
            expect(messages.length).toBe(1);
            expect(messages[0].message).toBe('too_deep');
        } else {
            expect(rejected.ok).toBeFalsy();
        }

        const input = buildChain(11);
        const accepted = schema.safeParse(input, { maxDepth: 11 });
        if (accepted.ok) {
            expect(accepted.value).toBe(input);
        } else {
            expect(accepted.ok).toBeTruthy();
        }
    });

    it('limits depth, not width', () => {
        type Pair = { left: Pair[]; right: Pair[] };
        const schema: p.Schema<Pair> = p.lazy(() => p.object({ left: p.array(schema), right: p.array(schema) }));

        function buildPair(depth: number): Pair {
            let node: Pair = { left: [], right: [] };
            for (let i = 0; i < depth - 1; i++) {
                node = { left: [node], right: [node] };
            }
            return node;
        }

        const input = buildPair(5);
        const result = schema.safeParse(input, { maxDepth: 5 });
        if (result.ok) {
            expect(result.value).toBe(input);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('rejects invalid values', () => {
        const schema: p.Schema<Node> = p.lazy(() => p.object({ children: p.array(schema) }));

        expect(() => schema.safeParse({ children: [] }, { maxDepth: Number.NaN })).toThrow();
        expect(() => schema.safeParse({ children: [] }, { maxDepth: -1 })).toThrow();
        expect(() => schema.safeParse({ children: [] }, { maxDepth: 1.5 })).toThrow();
        expect(() => schema.safeParse({ children: [] }, { maxDepth: Number.POSITIVE_INFINITY })).toThrow();
        expect(() => schema.safeParse({ children: [] }, { maxDepth: 0 })).toThrow();
        expect(() => schema.safeParse({ children: [] }, { maxDepth: 1 })).not.toThrow();
    });
});
