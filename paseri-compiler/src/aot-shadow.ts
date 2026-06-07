// Patches Schema.prototype.safeParse so every call also runs the AOT-compiled validator and asserts the two results
// match. Skips schemas that can't AOT-compile (no validator means no parity check); other compile/eval failures
// surface as test errors.

import { Schema } from '@paseri/paseri';
import type { IR, IRGraph } from '@paseri/paseri/introspect';
import '@paseri/paseri/introspect';
import ts from 'typescript';
import { ResolutionError } from './resolver.ts';
import { toSource } from './toSource.ts';

// Pre-warmed module cache populated at aot-shadow load time via top-level `await`, so subsequent compiles look up
// these URLs synchronously. Add new entries here if a new test file imports from a URL the generated parity
// validator will reproduce.
const PASERI_LIB_INDEX_URL = new URL('../../paseri-lib/src/index.ts', import.meta.url).href;
const moduleCache = new Map<string, unknown>([
    [PASERI_LIB_INDEX_URL, await import(PASERI_LIB_INDEX_URL)],
    // Generated validators import the result/message contract from this subpath (keyed by the bare specifier the
    // generated `import` uses, which `bindImports` looks up verbatim).
    ['@paseri/paseri/internal', await import('@paseri/paseri/internal')],
]);

interface ParityParseResult {
    readonly ok: boolean;
    readonly value?: unknown;
    readonly issue?: unknown;
}

type CompiledValidator = (value: unknown, options?: { maxDepth?: number }) => ParityParseResult;

function containsUnsupported(ir: IR): boolean {
    if (ir.kind === 'unsupported') {
        return true;
    }
    switch (ir.kind) {
        case 'array':
        case 'set':
        case 'record':
            return containsUnsupported(ir.element);
        case 'map':
            return containsUnsupported(ir.key) || containsUnsupported(ir.value);
        case 'tuple':
            return ir.elements.some(containsUnsupported);
        case 'object':
            return Object.values(ir.fields).some(containsUnsupported);
        case 'union':
            return ir.members.some(containsUnsupported);
        case 'optional':
        case 'nullable':
        case 'default':
        case 'refine':
            return containsUnsupported(ir.inner);
        case 'chain':
            return containsUnsupported(ir.from) || containsUnsupported(ir.to);
        // `ref` is intentionally omitted: its target lives in `graph.named` and is walked separately by
        // `graphContainsUnsupported`, so recursing here would force an unresolved-reference lookup we don't have.
        default:
            return false;
    }
}

function graphContainsUnsupported(graph: IRGraph): boolean {
    if (containsUnsupported(graph.entry)) {
        return true;
    }
    return Object.values(graph.named).some(containsUnsupported);
}

type ThrowingValidator = (value: unknown, options?: { maxDepth?: number }) => unknown;

interface CompiledModule {
    readonly safeParse: CompiledValidator;
    readonly parse: ThrowingValidator;
}

const compiledCache = new WeakMap<object, CompiledModule | null>();

interface ResolvedImport {
    readonly localName: string;
    readonly value: unknown;
}

/**
 * Walks a source file's import declarations and pairs each binding with its pre-warmed module from `moduleCache`.
 * Returns `null` if any URL isn't cached, so the caller can treat the schema as an honest skip.
 */
function bindImports(sourceFile: ts.SourceFile): ResolvedImport[] | null {
    const result: ResolvedImport[] = [];
    for (const statement of sourceFile.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
            continue;
        }
        const url = statement.moduleSpecifier.text;
        const moduleNamespace = moduleCache.get(url) as (Record<string, unknown> & { default?: unknown }) | undefined;
        if (moduleNamespace === undefined) {
            return null;
        }
        const importClause = statement.importClause;
        if (importClause === undefined || importClause.phaseModifier === ts.SyntaxKind.TypeKeyword) {
            continue;
        }
        if (importClause.name !== undefined) {
            result.push({ localName: importClause.name.text, value: moduleNamespace.default });
        }
        const namedBindings = importClause.namedBindings;
        if (namedBindings !== undefined) {
            if (ts.isNamespaceImport(namedBindings)) {
                result.push({ localName: namedBindings.name.text, value: moduleNamespace });
            } else if (ts.isNamedImports(namedBindings)) {
                for (const element of namedBindings.elements) {
                    if (element.isTypeOnly) {
                        continue;
                    }
                    const imported = element.propertyName?.text ?? element.name.text;
                    result.push({ localName: element.name.text, value: moduleNamespace[imported] });
                }
            }
        }
    }
    return result;
}

/**
 * Strips ES `import` declarations and `export` modifiers from `source` so the remainder can be wrapped in a
 * `new Function(...)` body. Operates on AST source ranges rather than a text regex, so an `export …` substring inside
 * a string-literal default — e.g. `.default('export function evil(){}')` — is left untouched.
 */
function stripModuleSyntax(source: string, sourceFile: ts.SourceFile): string {
    const ranges: { start: number; end: number }[] = [];
    for (const statement of sourceFile.statements) {
        if (ts.isImportDeclaration(statement)) {
            ranges.push({ start: statement.getStart(sourceFile), end: statement.end });
            continue;
        }
        const exportModifier = ts.canHaveModifiers(statement)
            ? ts.getModifiers(statement)?.find((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
            : undefined;
        if (exportModifier !== undefined) {
            ranges.push({ start: exportModifier.getStart(sourceFile), end: exportModifier.end });
        }
    }
    ranges.sort((a, b) => b.start - a.start);
    let result = source;
    for (const { start, end } of ranges) {
        result = result.slice(0, start) + result.slice(end);
    }
    return result;
}

/**
 * Compiles a schema's IR into both generated entries (`safeParse` + the throwing `parse`), evaluated via
 * `new Function(...)` rather than `import(data:...)` — the patched `safeParse` runs synchronously and can't `await` a
 * dynamic import. Returns `null` (and caches the decision) when the schema can't AOT-compile, so subsequent parses
 * short-circuit.
 */
function compileModule(schema: Schema<unknown>): CompiledModule | null {
    const cached = compiledCache.get(schema);
    if (cached !== undefined) {
        return cached;
    }
    const graph = schema.toIR();
    if (graphContainsUnsupported(graph)) {
        compiledCache.set(schema, null);
        return null;
    }
    let source: string;
    try {
        source = toSource(graph, { name: 'Shadow' });
    } catch (error) {
        if (error instanceof ResolutionError) {
            compiledCache.set(schema, null);
            return null;
        }
        throw error;
    }
    const parsedSource = ts.createSourceFile('_shadow.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const resolvedImports = bindImports(parsedSource);
    if (resolvedImports === null) {
        compiledCache.set(schema, null);
        return null;
    }
    const moduleSyntaxStripped = stripModuleSyntax(source, parsedSource);
    const transpiled = ts.transpileModule(moduleSyntaxStripped, {
        compilerOptions: { target: ts.ScriptTarget.Latest, module: ts.ModuleKind.ESNext },
    }).outputText;
    const argNames = resolvedImports.map((entry) => entry.localName);
    const argValues = resolvedImports.map((entry) => entry.value);
    // `'use strict'` so the body matches the real generated module (an always-strict ES module) — without it a
    // `new Function` body runs sloppy, where a free-called refine/chain callback would see `globalThis` as `this`
    // instead of `undefined`, a divergence from both the runtime and the real AOT output.
    const factory = new Function(
        ...argNames,
        `'use strict';\n${transpiled}\nreturn { safeParse: safeParseShadow, parse: parseShadow };`,
    );
    const compiled = factory(...argValues) as CompiledModule;
    compiledCache.set(schema, compiled);
    return compiled;
}

/** The generated `safeParse` entry, or `null` when the schema can't AOT-compile. Drives the parity patch. */
function compileSync(schema: Schema<unknown>): CompiledValidator | null {
    return compileModule(schema)?.safeParse ?? null;
}

/** The generated throwing `parse` entry, or `null` when the schema can't AOT-compile. */
function compileThrowingSync(schema: Schema<unknown>): ThrowingValidator | null {
    return compileModule(schema)?.parse ?? null;
}

function deepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) {
        return true;
    }
    if (a === null || b === null) {
        return false;
    }
    if (typeof a !== 'object' || typeof b !== 'object') {
        return false;
    }
    const aIsArray = Array.isArray(a);
    const bIsArray = Array.isArray(b);
    if (aIsArray !== bIsArray) {
        return false;
    }
    if (aIsArray && bIsArray) {
        if (a.length !== b.length) {
            return false;
        }
        return a.every((item, index) => deepEqual(item, b[index]));
    }
    // Set/Map parsers return new collections on the modified-element path, so reference equality (Object.is above)
    // doesn't fire; compare contents in iteration order (runtime and AOT both build from the input in input order).
    const aIsSet = a instanceof Set;
    const bIsSet = b instanceof Set;
    if (aIsSet !== bIsSet) {
        return false;
    }
    if (aIsSet && bIsSet) {
        if (a.size !== b.size) {
            return false;
        }
        const otherItems = [...b];
        return [...a].every((item, index) => deepEqual(item, otherItems[index]));
    }
    const aIsMap = a instanceof Map;
    const bIsMap = b instanceof Map;
    if (aIsMap !== bIsMap) {
        return false;
    }
    if (aIsMap && bIsMap) {
        if (a.size !== b.size) {
            return false;
        }
        const otherEntries = [...b];
        return [...a].every(([key, value], index) => {
            const [otherKey, otherValue] = otherEntries[index];
            return deepEqual(key, otherKey) && deepEqual(value, otherValue);
        });
    }
    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    const aKeys = Object.keys(aRecord);
    const bKeys = Object.keys(bRecord);
    if (aKeys.length !== bKeys.length) {
        return false;
    }
    return aKeys.every((key) => deepEqual(aRecord[key], bRecord[key]));
}

// Sibling error order is NOT part of paseri's contract: the issue tree's `join` shape only reflects the order issues
// were accumulated (runtime: input-iteration order; AOT: schema order), and neither is a documented guarantee. Compare
// the SET of leaf errors (each keyed by its path + full leaf content), not the tree's exact shape. Genuine divergences
// still fail: a missing/extra error, wrong path, wrong code/leaf field, or a precedence difference like length-vs-element
// (a different leaf set, not a reordering).
//
// This lives apart from `deepEqual` on purpose. (1) `deepEqual` is also the value comparator, and order-insensitivity
// is wrong for values — a validated value shaped like an issue node (`{ type: 'join', left, right }`) must still
// compare strictly. (2) A literal "sort then compare" would need a serialisation sort key, which drops symbol-valued
// object keys (paseri supports symbol fields); matching via `deepEqual` per leaf handles symbols correctly.
function issuesEquivalent(a: unknown, b: unknown): boolean {
    const leaves = (node: unknown): { path: PropertyKey[]; leaf: unknown }[] => {
        const out: { path: PropertyKey[]; leaf: unknown }[] = [];
        const walk = (current: unknown, path: PropertyKey[]): void => {
            if (typeof current === 'object' && current !== null) {
                const typed = current as {
                    type?: unknown;
                    left?: unknown;
                    right?: unknown;
                    key?: PropertyKey;
                    child?: unknown;
                };
                if (typed.type === 'join') {
                    walk(typed.left, path);
                    walk(typed.right, path);
                    return;
                }
                if (typed.type === 'nest') {
                    walk(typed.child, [...path, typed.key as PropertyKey]);
                    return;
                }
            }
            out.push({ path, leaf: current });
        };
        walk(node, []);
        return out;
    };
    const flatA = leaves(a);
    const flatB = leaves(b);
    if (flatA.length !== flatB.length) {
        return false;
    }
    const remaining = [...flatB];
    for (const itemA of flatA) {
        const index = remaining.findIndex(
            (itemB) => deepEqual(itemA.path, itemB.path) && deepEqual(itemA.leaf, itemB.leaf),
        );
        if (index === -1) {
            return false;
        }
        remaining.splice(index, 1);
    }
    return true;
}

function describe(root: unknown): string {
    try {
        return JSON.stringify(root, (_key, value) => (typeof value === 'bigint' ? `${value}n` : value));
    } catch {
        return String(root);
    }
}

function divergenceError(
    schema: Schema<unknown>,
    reason: string,
    input: unknown,
    runtime: unknown,
    aot: unknown,
): Error {
    return new Error(
        `AOT parity divergence on ${schema.constructor.name} (${reason}); input=${describe(input)}\nruntime=${describe(runtime)}\nAOT=${describe(aot)}`,
    );
}

/**
 * Throws if the runtime and AOT results disagree on `ok`, the produced value (when both ok), or the issue (when both
 * failed). Caller is the patched `safeParse`; the exception surfaces in the test that triggered the parse.
 */
function assertParity(
    schema: Schema<unknown>,
    runtimeResult: ParityParseResult,
    aotResult: ParityParseResult,
    value: unknown,
): void {
    if (runtimeResult.ok !== aotResult.ok) {
        throw new Error(
            `AOT parity divergence on ${schema.constructor.name} (ok mismatch): runtime.ok=${runtimeResult.ok}, aot.ok=${aotResult.ok}; input=${describe(value)}`,
        );
    }
    if (runtimeResult.ok) {
        if (!deepEqual(runtimeResult.value, aotResult.value)) {
            throw divergenceError(schema, 'value mismatch', value, runtimeResult.value, aotResult.value);
        }
    } else if (!issuesEquivalent(runtimeResult.issue, aotResult.issue)) {
        throw divergenceError(schema, 'issue mismatch', value, runtimeResult.issue, aotResult.issue);
    }
}

const originalSafeParse = Schema.prototype.safeParse;
Schema.prototype.safeParse = function (value: unknown, options?: { maxDepth?: number }) {
    const runtimeResult = originalSafeParse.call(this, value, options);
    const compiled = compileSync(this as Schema<unknown>);
    if (compiled !== null) {
        const aotResult = compiled(value, options);
        assertParity(this as Schema<unknown>, runtimeResult as ParityParseResult, aotResult, value);
    }
    return runtimeResult;
};

// Exposed for tests that must invoke the AOT validator directly — e.g. asserting it throws on an invalid maxDepth,
// which the patched safeParse above can't show because the runtime call throws first.
export { type CompiledValidator, compileSync, compileThrowingSync };
