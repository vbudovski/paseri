/**
 * Vite plugin to compile [Paseri](https://github.com/vbudovski/paseri/blob/main/paseri-lib/README.md)
 * schemas at build time. Simply write your schemas in `*.schema.ts` files, and they will be replaced
 * with ahead-of-time compiled versions in production builds.
 *
 * Requires Vite 7+.
 *
 * @example
 * ```ts ignore
 * // vite.config.ts
 * import { paseri } from '@paseri/vite-plugin';
 *
 * export default {
 *     plugins: [paseri()],
 * };
 * ```
 *
 * @module
 */
import type { Logger, ResolvedConfig, Plugin as VitePlugin } from 'vite';
import { runnerImport } from 'vite';
import { type AggregatorEntry, buildAggregator, collectSchemaExports, compileSchema } from './compile.ts';
import { SCHEMA_SUFFIX } from './constants.ts';
import { checkSchemaImportUsage } from './guard.ts';
import { encodeVirtualId, isVirtualId, parseVirtualId } from './virtual.ts';

// `paseri` is public, so a direct reference to Vite's Plugin would leak as a private-type-ref in deno doc.
// Keep this local @internal alias rather than inlining it.
/** @internal */
type Plugin = VitePlugin;

/** Options for the Paseri Vite plugin. */
interface PaseriPluginOptions {
    /**
     * Bare module specifiers a `refine`/`chain` callback may reference, forwarded to the
     * compiler's resolver. An unknown bare specifier is otherwise a compile error.
     */
    readonly trustedBareSpecifiers?: readonly string[];
}

function stripQuery(id: string): string {
    const index = id.indexOf('?');
    return index === -1 ? id : id.slice(0, index);
}

// Evaluate the schema file through Vite's pipeline and return its live exports. A
// synthetic entry imports the introspect side-effect FIRST (same runner realm), so
// `.toIR()` exists on the schema instances and refine/chain call-site capture works.
// The build's resolve config is forwarded so the file's imports resolve as in the main
// build, otherwise a schema (or its refine/chain dependency) can resolve differently in
// the eval realm than in the bundle.
async function evaluateSchemaFile(
    file: string,
    resolve: ResolvedConfig['resolve'],
): Promise<Readonly<Record<string, unknown>>> {
    const entryId = `paseri-eval:${file}`;
    const resolvedEntry = `\0${entryId}`;
    const { module } = await runnerImport<Record<string, unknown>>(entryId, {
        // `alias`, `dedupe`, `extensions`, and `preserveSymlinks` flow from the top-level
        // resolve into the eval environment. `conditions`/`mainFields` do NOT — Vite strips
        // them before folding the top-level resolve into each environment — so they are set
        // on the `inline` environment runnerImport uses (see the `environments` block).
        resolve: {
            alias: resolve.alias,
            dedupe: resolve.dedupe,
            extensions: resolve.extensions,
            preserveSymlinks: resolve.preserveSymlinks,
        },
        // runnerImport forces this environment's `conditions` to `["node", ...]` and
        // `mainFields` to `[]`. Both are arrays, and Vite's config merge concatenates the
        // caller's values AHEAD of the forced ones, so the build's conditions/mainFields are
        // tried first. (`["node", ...]` can't be removed, only out-prioritised.)
        environments: {
            inline: {
                resolve: {
                    conditions: resolve.conditions,
                    mainFields: resolve.mainFields,
                },
            },
        },
        plugins: [
            {
                name: 'paseri:eval-entry',
                resolveId(id: string): string | null {
                    return id === entryId ? resolvedEntry : null;
                },
                load(id: string): string | null {
                    if (id !== resolvedEntry) {
                        return null;
                    }
                    // `export *` (bare) drops the file's default export, so a schema written as
                    // `export default …` would vanish. `export * as` builds a namespace that includes the
                    // default, which the caller reads back via `.schemas`.
                    return `import '@paseri/paseri/introspect';\nexport * as schemas from ${JSON.stringify(file)};\n`;
                },
            },
        ],
    });
    return module.schemas as Readonly<Record<string, unknown>>;
}

// Dev-only: evaluate + compile each schema in a `.schema.ts` to surface AOT-compile
// failures early, WITHOUT replacing the executed module (dev runs the real schema).
// Never throws — reports through the logger so a failure doesn't break the dev server.
async function compileCheck(
    file: string,
    resolve: ResolvedConfig['resolve'],
    options: PaseriPluginOptions,
    logger: Logger,
): Promise<void> {
    try {
        const schemaExports = collectSchemaExports(await evaluateSchemaFile(file, resolve));
        if (schemaExports.length === 0) {
            logger.warn(`paseri: ${file} has no Paseri schema exports — build will error.`);
            return;
        }
        for (const { name, schema } of schemaExports) {
            compileSchema(name, schema, options);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`paseri: ${file} will fail AOT compilation at build — ${message}`);
    }
}

/**
 * Create the Paseri Vite plugin.
 *
 * @param options - Plugin options.
 * @returns A Vite plugin that compiles `*.schema.ts` modules to AOT validators at `vite build`.
 */
function paseri(options: PaseriPluginOptions = {}): Plugin {
    // schema-file absolute path -> (export name -> generated module source).
    const compiled = new Map<string, Map<string, string>>();
    // Captured from the resolved config so the eval environment resolves imports
    // (aliases, conditions, dedupe, extensions, …) exactly as the main build does.
    let resolveOptions: ResolvedConfig['resolve'] | undefined;
    let command: ResolvedConfig['command'] = 'build';
    let logger: Logger | undefined;

    return {
        name: 'paseri',
        configResolved(config: ResolvedConfig): void {
            resolveOptions = config.resolve;
            command = config.command;
            logger = config.logger;
        },
        resolveId(id: string): string | null {
            // Claim our virtual ids as-is (no `\0`), so Vite's TS transform still runs.
            return isVirtualId(id) ? id : null;
        },
        load(id: string): string | null {
            if (!isVirtualId(id)) {
                return null;
            }
            const { file, name } = parseVirtualId(id);
            const source = compiled.get(file)?.get(name);
            if (source === undefined) {
                throw new Error(`paseri: no compiled output for "${name}" in ${file}`);
            }
            // Return TypeScript verbatim; the `.ts`-suffixed, un-prefixed id means Vite
            // transpiles it in its own pipeline.
            return source;
        },
        async transform(code: string, id: string): Promise<string | null> {
            // Skip our own virtual modules (their id also ends in `.schema.ts` after the
            // query is stripped — without this guard the plugin re-evaluates its output and
            // recurses) and any other plugin's `\0` virtual modules.
            if (isVirtualId(id) || id.startsWith('\0')) {
                return null;
            }
            const file = stripQuery(id);
            const isSchema = file.endsWith(SCHEMA_SUFFIX);

            // `configResolved` always runs before any `transform`, so this is set; the guard
            // is for the type narrowing only.
            if (resolveOptions === undefined) {
                return null;
            }

            // Dev (serve): transparent — never replace executed code. Just background-check
            // that schemas will AOT-compile and surface failures via the logger.
            if (command === 'serve') {
                if (isSchema && logger !== undefined) {
                    await compileCheck(file, resolveOptions, options, logger);
                }
                return null;
            }

            // Build: AOT-compile schemas; guard app modules against parse-only misuse.
            if (!isSchema) {
                checkSchemaImportUsage(code, id);
                return null;
            }
            const schemaExports = collectSchemaExports(await evaluateSchemaFile(file, resolveOptions));
            if (schemaExports.length === 0) {
                throw new Error(`paseri: ${file} has no Paseri schema exports`);
            }
            const perFile = new Map<string, string>();
            const entries: AggregatorEntry[] = [];
            for (const { name, schema } of schemaExports) {
                perFile.set(name, compileSchema(name, schema, options));
                entries.push({ name, specifier: encodeVirtualId(file, name) });
            }
            compiled.set(file, perFile);
            return buildAggregator(entries);
        },
    };
}

export type { PaseriPluginOptions };
export { paseri };
