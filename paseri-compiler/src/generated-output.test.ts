import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import * as p from '@vbudovski/paseri';
import '@vbudovski/paseri/introspect';
import { compileSync, compileThrowingSync } from './aot-shadow.ts';
import { toSource } from './toSource.ts';

// These assert properties of the generated output that the parity harness can't: it transpiles types away (so it
// can't see a bad type annotation), and it calls the runtime before the AOT validator (so it can't see the AOT's
// maxDepth handling — the runtime throws first).

it('emits parameterised Set/Map type annotations so generated modules type-check', () => {
    const setSource = toSource(p.set(p.string().optional().default('x')).toIR(), { name: 'SetWithDefault' });
    expect(setSource.includes('Set<unknown>')).toBe(true);
    expect(/:\s*Set\s*\|/.test(setSource)).toBe(false);

    const mapSource = toSource(p.map(p.string(), p.number().optional().default(0)).toIR(), { name: 'MapWithDefault' });
    expect(mapSource.includes('Map<unknown, unknown>')).toBe(true);
    expect(/:\s*Map\s*\|/.test(mapSource)).toBe(false);
});

it('record-casts the fast-path default-fill clone so generated modules type-check', () => {
    // The fast path clones the value to fill in absent defaults: `const _out = { ...value }`. Spreading the
    // `object`-narrowed value infers type `{}`, so the fill assignment `_out["count"] = ...` is an implicit-any
    // index error (TS7053) in the standalone module. The slow path already record-casts its clone; the fast path
    // must too, so the clone is typed `Record<PropertyKey, any>` and indexed assignment is valid.
    const source = toSource(p.object({ hello: p.string(), count: p.number().optional().default(0) }).toIR(), {
        name: 'DefaultFill',
    });
    expect(/const _out\d+ = \{ \.\.\.value as Record<PropertyKey, any> \}/.test(source)).toBe(true);
});

it('types the hoisted refine predicate const so generated modules type-check', () => {
    // The predicate is hoisted verbatim; without a type annotation on the const, its `(value) =>` param would be an
    // implicit any (TS7006) in the standalone module. The annotation gives it the inner output type contextually.
    const source = toSource(
        p
            .number()
            .refine((value) => value > 0, { code: 'x' })
            .toIR(),
        { name: 'R' },
    );
    expect(/const _refine\d+: \(value: number\) => boolean =/.test(source)).toBe(true);
});

it('throws on an invalid maxDepth, matching the runtime', () => {
    type Node = { children: Node[] };
    const schema: p.Schema<Node> = p.lazy(() => p.object({ children: p.array(schema) }));
    const validator = compileSync(schema as p.Schema<unknown>);
    expect(validator).not.toBe(null);
    if (validator === null) {
        return;
    }
    for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(() => validator({ children: [] }, { maxDepth: bad })).toThrow('maxDepth must be a positive integer.');
    }
    const result = validator({ children: [] }, { maxDepth: 5 });
    expect(result.ok).toBe(true);
});

it('emits a throwing `parse` entry mirroring the runtime: bare value on success, PaseriError on failure', () => {
    const schema = p.object({ hello: p.string() });
    const parse = compileThrowingSync(schema as p.Schema<unknown>);
    expect(parse).not.toBe(null);
    if (parse === null) {
        return;
    }
    // Success returns the bare value, not a `ParseResult` wrapper.
    expect(parse({ hello: 'world' })).toEqual({ hello: 'world' });

    // Failure throws, and the thrown error must match what the runtime's own throwing `parse` produces — the oracle
    // is the runtime contract, not the generated code. (`schema.parse` calls `_parse` directly, so it isn't routed
    // through the parity-patched `safeParse`.)
    let generatedError: unknown;
    try {
        parse({ hello: 123 });
    } catch (error) {
        generatedError = error;
    }
    let runtimeError: unknown;
    try {
        schema.parse({ hello: 123 });
    } catch (error) {
        runtimeError = error;
    }
    expect(generatedError).toBeInstanceOf(p.PaseriError);
    expect((generatedError as p.PaseriError).messages()).toEqual((runtimeError as p.PaseriError).messages());
});

it('deduplicates an identical temporal bound across min and max', () => {
    const bound = Temporal.PlainDate.from('2020-01-01');
    const source = toSource(p.plainDate().min(bound).max(bound).toIR(), { name: 'Bounds' });
    const boundConsts = source.match(/const _bound\d+ =/g) ?? [];
    expect(boundConsts.length).toBe(1);
});
