import type { IR } from '@paseri/paseri/introspect';
import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { barrelSource, fixtureSource, MATRIX } from './generated-fixtures/matrix.ts';
// Importing the barrel pulls every committed fixture into this test's static module graph, so `deno test`'s type-check
// pass validates the generated output — coverage the parity harness can't give, since it erases types before running
// the code. A malformed annotation (wrong `result.value` type, a body that fails strict `deno check`) in any fixture
// fails the run here.
import './generated-fixtures/index.gen.ts';

const FIXTURES_DIR = new URL('./generated-fixtures/', import.meta.url);

// Collects every IR `kind` reachable from a node, recursing into composite arms. `ref` is a leaf here; its target
// lives in `graph.named` and is walked separately by the caller.
function collectKinds(ir: IR, into: Set<string>): void {
    into.add(ir.kind);
    switch (ir.kind) {
        case 'array':
        case 'set':
        case 'record':
            collectKinds(ir.element, into);
            return;
        case 'map':
            collectKinds(ir.key, into);
            collectKinds(ir.value, into);
            return;
        case 'tuple':
            for (const element of ir.elements) {
                collectKinds(element, into);
            }
            return;
        case 'object':
            for (const field of Object.values(ir.fields)) {
                collectKinds(field, into);
            }
            return;
        case 'union':
            for (const member of ir.members) {
                collectKinds(member, into);
            }
            return;
        case 'optional':
        case 'nullable':
        case 'default':
        case 'refine':
            collectKinds(ir.inner, into);
            return;
        case 'chain':
            collectKinds(ir.from, into);
            collectKinds(ir.to, into);
            return;
        default:
            return;
    }
}

// The compiler has one emitter file (or directory) per IR kind; helpers are `_`-prefixed and there is no
// `unsupported` emitter. So the emitter set IS the set of kinds the compiler emits — the source of truth the matrix
// must cover.
function emittableKinds(): Set<string> {
    const kinds = new Set<string>();
    for (const entry of Deno.readDirSync(new URL('./emitters', import.meta.url))) {
        if (entry.name.startsWith('_') || entry.name.endsWith('.test.ts')) {
            continue;
        }
        if (entry.isDirectory) {
            kinds.add(entry.name);
        } else if (entry.name.endsWith('.ts')) {
            kinds.add(entry.name.slice(0, -'.ts'.length));
        }
    }
    return kinds;
}

describe('generated fixtures', () => {
    it('are byte-identical to current codegen (re-run `deno task generate_fixtures`)', async () => {
        const stale: string[] = [];
        for (const entry of MATRIX) {
            const committed = await Deno.readTextFile(new URL(`${entry.name}.gen.ts`, FIXTURES_DIR));
            if (committed !== fixtureSource(entry)) {
                stale.push(`${entry.name}.gen.ts`);
            }
        }
        const committedBarrel = await Deno.readTextFile(new URL('index.gen.ts', FIXTURES_DIR));
        if (committedBarrel !== barrelSource()) {
            stale.push('index.gen.ts');
        }
        expect(stale).toEqual([]);
    });

    it('have no orphans (every committed fixture maps to a matrix entry)', () => {
        const onDisk = new Set<string>();
        for (const entry of Deno.readDirSync(FIXTURES_DIR)) {
            if (entry.name.endsWith('.gen.ts') && entry.name !== 'index.gen.ts') {
                onDisk.add(entry.name.slice(0, -'.gen.ts'.length));
            }
        }
        const expected = new Set(MATRIX.map((entry) => entry.name));
        expect([...onDisk].sort()).toEqual([...expected].sort());
    });

    it('cover every emittable IR kind (drift guard against a new emitter slipping in untested)', () => {
        const covered = new Set<string>();
        for (const { schema } of MATRIX) {
            const graph = schema.toIR();
            collectKinds(graph.entry, covered);
            for (const named of Object.values(graph.named)) {
                collectKinds(named, covered);
            }
        }
        const missing = [...emittableKinds()].filter((kind) => !covered.has(kind)).sort();
        expect(missing).toEqual([]);
    });
});
