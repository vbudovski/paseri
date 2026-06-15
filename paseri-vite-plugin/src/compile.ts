// Pure, bundler-independent compile core: turn live Paseri schema instances into
// generated module sources. No Vite knowledge here — the plugin (index.ts) drives
// evaluation and wires these outputs into virtual modules.
import { toSource } from '@paseri/compiler';

// `toSource`'s first parameter is paseri-lib's IRGraph; derive it rather than
// importing the type, which isn't re-exported from @paseri/compiler.
type IRGraph = Parameters<typeof toSource>[0];

interface SchemaLike {
    toIR(): IRGraph;
    safeParse(value: unknown): unknown;
}

interface CompileOptions {
    // Bare module specifiers a refine/chain callback may reference, forwarded to the
    // compiler's resolver (otherwise an unknown bare specifier is a compile error).
    readonly trustedBareSpecifiers?: readonly string[];
}

interface SchemaExport {
    readonly name: string;
    readonly schema: SchemaLike;
}

interface AggregatorEntry {
    readonly name: string;
    readonly specifier: string;
}

// A `.schema.ts` export is compilable iff the introspect side-effect gave it `toIR`
// (the public entry doesn't export the base class, so duck-type instead of instanceof).
function isSchemaLike(value: unknown): value is SchemaLike {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { toIR?: unknown }).toIR === 'function' &&
        typeof (value as { safeParse?: unknown }).safeParse === 'function'
    );
}

function collectSchemaExports(moduleNamespace: Readonly<Record<string, unknown>>): SchemaExport[] {
    const exports: SchemaExport[] = [];
    for (const [name, value] of Object.entries(moduleNamespace)) {
        if (isSchemaLike(value)) {
            exports.push({ name, schema: value });
        }
    }
    return exports;
}

// One generated module per schema: the `toSource` output plus a typed parse-only
// stand-in keeping the export name callers already import. The explicit `typeof`-based
// annotation is required under isolatedDeclarations / JSR no-slow-types.
function compileSchema(name: string, schema: SchemaLike, options: CompileOptions = {}): string {
    const sourceOptions =
        options.trustedBareSpecifiers !== undefined
            ? { name, trustedBareSpecifiers: options.trustedBareSpecifiers }
            : { name };
    const generated = toSource(schema.toIR(), sourceOptions);
    return (
        `${generated}\n` +
        `export const ${name}: { safeParse: typeof safeParse${name}; parse: typeof parse${name} } = ` +
        `{ safeParse: safeParse${name}, parse: parse${name} };\n`
    );
}

// The replacement for the `.schema.ts` module itself: re-export each schema's
// stand-in from its own generated module. No concatenation -> no duplicate-import or
// name-counter collisions across multiple schemas in one file.
function buildAggregator(entries: readonly AggregatorEntry[]): string {
    return `${entries.map((entry) => `export { ${entry.name} } from ${JSON.stringify(entry.specifier)};`).join('\n')}\n`;
}

export type { AggregatorEntry, CompileOptions, SchemaExport, SchemaLike };
export { buildAggregator, collectSchemaExports, compileSchema };
