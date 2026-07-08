import { expect } from '@std/expect';
import { afterAll, describe, it } from '@std/testing/bdd';
import '@paseri/paseri/introspect';
import * as p from '@paseri/paseri';
import { type Alias, build, type Rollup } from 'vite';
import { paseri } from './index.ts';

// `@paseri/paseri*` are JSR workspace packages, not npm-installed, so Vite's node
// resolver can't find them by bare name. Alias them to paseri-lib source — the same
// thing a real consumer's installed package provides.
const lib = (rel: string): string => new URL(`../../paseri-lib/src/${rel}`, import.meta.url).pathname;
const alias: Alias[] = [
    { find: /^@paseri\/paseri\/internal$/, replacement: lib('internal/index.ts') },
    { find: /^@paseri\/paseri\/introspect$/, replacement: lib('introspect/index.ts') },
    { find: /^@paseri\/paseri$/, replacement: lib('index.ts') },
];

const root = new URL('../test-fixture/', import.meta.url).pathname;
// Temp bundle output at the package root, NOT under src/ (the coverage-scoped path), so
// `deno coverage --include=…/src/` never tries to map these deleted files.
const outDir = new URL('../__build__/', import.meta.url);

async function buildEntry(entry: string): Promise<string> {
    const result = (await build({
        root,
        logLevel: 'silent',
        configFile: false,
        resolve: { alias },
        plugins: [paseri()],
        build: {
            write: false,
            minify: false,
            lib: { entry, formats: ['es'], fileName: 'out' },
        },
    })) as Rollup.RollupOutput | Rollup.RollupOutput[];
    const outputs = Array.isArray(result) ? result : [result];
    const chunk = outputs.flatMap((output) => output.output).find((item) => item.type === 'chunk');
    if (chunk === undefined || chunk.type !== 'chunk') {
        throw new Error('no chunk emitted');
    }
    return chunk.code;
}

// Build the entry, write the bundle to disk, and import it. Returns the bundle source
// (for static assertions) and the entry's exported `validate` function.
async function buildAndImport(
    entry: string,
    fileName: string,
): Promise<{ code: string; validate: (value: unknown) => unknown }> {
    const code = await buildEntry(entry);
    await Deno.mkdir(outDir, { recursive: true });
    const target = new URL(`./${fileName}`, outDir);
    await Deno.writeTextFile(target, code);
    const module = await import(target.href);
    return { code, validate: module.validate };
}

// Parity oracle: the compiled validator must produce results identical to the runtime
// schema across every case.
function assertParity(
    validate: (value: unknown) => unknown,
    oracle: { safeParse(value: unknown): unknown },
    cases: readonly unknown[],
): void {
    for (const input of cases) {
        expect(JSON.stringify(validate(input))).toBe(JSON.stringify(oracle.safeParse(input)));
    }
}

afterAll(async () => {
    await Deno.remove(outDir, { recursive: true }).catch(() => {});
});

describe('vite build', () => {
    it('replaces the schema with an AOT validator, drops runtime traversal, and runs end-to-end', async () => {
        const { code, validate } = await buildAndImport('entry.ts', 'out.mjs');
        // AOT validator is in the bundle...
        expect(code).toContain('safeParseUser');
        // ...and the runtime schema-traversal machinery is not (the .schema.ts module
        // was replaced, so ObjectSchema / toIR never reach the output graph).
        expect(code).not.toContain('ObjectSchema');
        expect(code).not.toContain('.toIR');

        // Integration smoke: the bundled, transpiled validator executes and discriminates
        // valid from invalid. Exhaustive parity is the compiler's aot-shadow suite, not here.
        const runtime = p.object({
            id: p.number().int().gte(1),
            name: p.string().min(1).max(50),
        });
        assertParity(validate, runtime, [{ id: 1, name: 'Ada' }, 'not an object']);
    });

    it('inlines a recursive schema composed across files', async () => {
        const { code, validate } = await buildAndImport('entry-recursive.ts', 'out-recursive.mjs');
        expect(code).toContain('safeParseThread');
        expect(code).not.toContain('comment.schema'); // recursive Comment inlined, not re-imported
        expect(code).not.toContain('ObjectSchema');

        // Oracle: the same recursive Comment + Thread, constructed at runtime.
        type Comment = { body: string; replies: Comment[] };
        const RuntimeComment: p.Schema<Comment> = p.lazy(() =>
            p.object({ body: p.string().min(1), replies: p.array(RuntimeComment) }),
        );
        const runtime = p.object({ title: p.string().min(1), comments: p.array(RuntimeComment) });

        // A deep-nested valid case plus a deep failure proves the inlined recursive
        // validator runs in the bundle; breadth is covered by aot-shadow.
        const cases: unknown[] = [
            { title: 't', comments: [{ body: 'a', replies: [{ body: 'b', replies: [] }] }] }, // nested OK
            { title: 't', comments: [{ body: 'a', replies: [{ body: '', replies: [] }] }] }, // deep failure
        ];
        assertParity(validate, runtime, cases);
    });

    it('compiles a schema exported as the module default', async () => {
        // A schema written as `export default …` must compile like a named one; the loader has to expose
        // the default (a bare `export *` drops it, which would report the file as having no schema exports).
        const { code, validate } = await buildAndImport('entry-default.ts', 'out-default.mjs');
        expect(code).not.toContain('ObjectSchema'); // runtime traversal dropped → the default was AOT-compiled
        const runtime = p.object({ id: p.number().int().gte(1) });
        assertParity(validate, runtime, [{ id: 1 }, { id: 0 }, 'nope']);
    });

    it('rejects app code that uses a schema export beyond .safeParse/.parse', async () => {
        await expect(buildEntry('entry-misuse.ts')).rejects.toThrow('User.optional');
    });
});
