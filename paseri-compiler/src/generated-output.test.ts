import * as p from '@paseri/paseri';
import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import '@paseri/paseri/introspect';
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
    // must too, so the clone is typed `Record<PropertyKey, unknown>` and indexed assignment is valid.
    const source = toSource(p.object({ hello: p.string(), count: p.number().optional().default(0) }).toIR(), {
        name: 'DefaultFill',
    });
    expect(/const _out\d+ = \{ \.\.\.value as Record<PropertyKey, unknown> \}/.test(source)).toBe(true);
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

it('types the refine before-snapshot const so generated modules type-check', () => {
    // Inside a container element loop, the snapshot const participates in the loop back-edge's narrowing of the
    // issue accumulator it compares against (`_refineBeforeN === _issueM`), so its inferred type is circular —
    // TS7022 in the standalone module. An explicit `TreeNode | undefined` annotation breaks the cycle.
    const source = toSource(
        p.object({ tags: p.array(p.string().refine((value) => !value.includes(' '), { code: 'has_space' })) }).toIR(),
        { name: 'ElementRefine' },
    );
    expect(/const _refineBefore\d+: TreeNode \| undefined =/.test(source)).toBe(true);
    expect(/const _refineBefore\d+ =/.test(source)).toBe(false);
});

it('inlines acyclic lazy targets instead of emitting named functions', () => {
    // A forward-reference lazy never recurses, so its target is inlined at the ref site with a statically-known
    // depth — no `_lazy_0` function, no per-call result allocation. The cyclic case below keeps its function.
    const userSchema = p.object({ name: p.string() });
    const acyclicSource = toSource(p.object({ author: p.lazy(() => userSchema) }).toIR(), { name: 'Acyclic' });
    expect(/function _lazy_\d+\(/.test(acyclicSource)).toBe(false);
    expect(acyclicSource.includes('_slowAcyclic')).toBe(true);

    type Node = { next?: Node | undefined };
    const cyclicSchema: p.Schema<Node> = p.lazy(() => p.object({ next: cyclicSchema.optional() }));
    const cyclicSource = toSource(cyclicSchema.toIR(), { name: 'Cyclic' });
    expect(/function _lazy_\d+\(value: unknown, depth: number, maxDepth: number\)/.test(cyclicSource)).toBe(true);
});

it('emits a constant depth boundary check for nested acyclic lazy targets', () => {
    const inner = p.object({ value: p.string() });
    const schema = p.lazy(() => p.object({ child: p.lazy(() => inner) }));
    const source = toSource(schema.toIR(), { name: 'Nested' });
    // The outer boundary is depth 0 (statically dead, omitted); the inner is depth 1.
    expect(source.includes('1 >= maxDepth')).toBe(true);
    expect(source.includes('0 >= maxDepth')).toBe(false);
});

it('emits a recursive shape fast path for lazy schemas', () => {
    type Comment = { body: string; reply?: Comment | undefined };
    const schema: p.Schema<Comment> = p.lazy(() => p.object({ body: p.string(), reply: schema.optional() }));
    const source = toSource(p.object({ pinned: schema }).toIR(), { name: 'Thread' });
    expect(/function _shapeLazy\d+\(value: unknown, depth: number, maxDepth: number\): boolean/.test(source)).toBe(
        true,
    );
    expect(source.includes('_slowThread')).toBe(true);
});

it('emits a shape fast path for containers of strict objects', () => {
    // The element object's strict-extras level can't aggregate into the entry's statement-form count pass, so it
    // folds into the element shape as a hoisted key-count helper instead of bailing the whole fast path.
    const source = toSource(p.object({ items: p.array(p.object({ id: p.number() })) }).toIR(), { name: 'List' });
    expect(/function _extrasOk\d+/.test(source)).toBe(true);
    expect(source.includes('_slowList')).toBe(true);
});

it('discards ref shape helpers when the lazy target is unshapeable', () => {
    // The chain inside the recursive target has no shape form, so the ref helper's generation fails midway. The
    // partially built helpers must be discarded — a leftover declaration could reference a recursive identifier
    // that is never emitted — and the schema must still compile via the accumulate path.
    type Node = { id: number; child?: Node | undefined };
    // Capture-free chain callback (no closed-over identifiers), so the schema still compiles via the accumulate path.
    const schema: p.Schema<Node> = p.lazy(() =>
        p.object({
            id: p.string().chain(p.number(), (value) => ({ ok: true, value: Number(value) })),
            child: schema.optional(),
        }),
    );
    const source = toSource(p.object({ root: schema }).toIR(), { name: 'Unshapeable' });
    expect(source.includes('_shapeLazy')).toBe(false);
    const validator = compileSync(schema as p.Schema<unknown>);
    expect(validator).not.toBe(null);
    if (validator === null) {
        return;
    }
    const result = validator({ id: '3', child: { id: '4' } });
    expect(result.ok).toBe(true);
});

it('emits no dead shape helpers when the entry is unshapeable', () => {
    // The chain field makes the whole entry unshapeable, so the attempt bails AFTER the array field's shape walk
    // would have hoisted its element helper; the transactional rollback must discard it rather than leave a dead
    // module-scope function.
    const schema = p.object({
        items: p.array(p.string()),
        id: p.string().chain(p.number(), (value) => ({ ok: true, value: Number(value) })),
    });
    const source = toSource(schema.toIR(), { name: 'Bailed' });
    expect(source.includes('_shapeArray')).toBe(false);
});

it('emits a boolean pre-check ahead of the union try-each so clean matches skip the issue machinery', () => {
    // The chain field keeps the object off the shape fast path, so the union runs in accumulate form — which
    // previously allocated per-member issue nodes even when a later member matched. A mixed literal/primitive
    // union (not all-literal, so it stays off the Set.has path) exercises the pre-check.
    const schema = p.object({
        role: p.union(p.literal('admin'), p.number()),
        id: p.string().chain(p.number(), (value) => ({ ok: true, value: Number(value) })),
    });
    const source = toSource(schema.toIR(), { name: 'Pre' });
    expect(
        /if \(!\(_value\d+ === "admin" \|\| typeof _value\d+ === "number" && !\(Number\.isNaN\(_value\d+\)\)\)\)/.test(
            source,
        ),
    ).toBe(true);
});

it('emits an enum-style Set.has membership test for an all-literal union, converging with the runtime', () => {
    // Every member is a bare literal, so the union reduces to the same `Set.has` check the runtime takes — a single
    // `invalid_enum_value` leaf instead of the try-each form's per-member `invalid_value` tree.
    const schema = p.union(p.literal('admin'), p.literal('user'), p.literal('guest'));
    const source = toSource(schema.toIR(), { name: 'Roles' });
    expect(source.includes('new Set<unknown>(["admin", "user", "guest"])')).toBe(true);
    expect(/\.has\(value\)/.test(source)).toBe(true);
    expect(source.includes('INVALID_ENUM_VALUE')).toBe(true);
    // The try-each member-scan machinery must not be emitted.
    expect(source.includes('_success')).toBe(false);
});

it('emits exactly one success return per validator function', () => {
    // The trailing success return is skipped when the emitted body already ends in a return — the duplicate was
    // unreachable and repeated the full inline output type.
    const source = toSource(p.object({ hello: p.string() }).toIR(), { name: 'Single' });
    const successReturns = source.match(/return \{ ok: true as const/g) ?? [];
    // One in the slow function and one in the shape entry's success path.
    expect(successReturns.length).toBe(2);
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
