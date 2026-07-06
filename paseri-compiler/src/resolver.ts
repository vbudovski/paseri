// Source-file resolution for refine/chain free identifiers.
//
// Given a callSite file URL and a list of names that the predicate captured,
// we open that file, locate each name's top-level declaration, and produce a
// list of hoist text snippets to prepend to the generated module. The
// declarations are reproduced verbatim from the user's source — JS scope
// lookups in the emitted output then bind the predicate to them.

import { readFileSync, statSync } from 'node:fs';
import ts from 'typescript';

interface ResolvedBindings {
    readonly hoists: readonly string[];
    readonly imports: readonly string[];
}

type ImportBinding =
    | { readonly kind: 'named'; readonly imported: string; readonly local: string; readonly moduleSpecifier: string }
    | { readonly kind: 'default'; readonly local: string; readonly moduleSpecifier: string }
    | { readonly kind: 'namespace'; readonly local: string; readonly moduleSpecifier: string };

class ResolutionError extends Error {}

const sourceFileCache = new Map<string, { readonly mtimeMs: number; readonly sourceFile: ts.SourceFile | null }>();

/**
 * Reads and parses a source file from disk. Only `file://` URLs are loaded. The parse is cached keyed by the
 * file's modification time, so a long-lived process (a vite dev/watch server) re-reads a file after it changes
 * rather than serving a stale parse.
 */
function loadSourceFile(fileUrl: string): ts.SourceFile | null {
    let url: URL;
    try {
        url = new URL(fileUrl);
    } catch {
        return null;
    }
    if (url.protocol !== 'file:') {
        return null;
    }
    let mtimeMs: number;
    try {
        mtimeMs = statSync(url).mtimeMs;
    } catch {
        // Missing or unreadable — drop any cached parse rather than serve it stale.
        sourceFileCache.delete(fileUrl);
        return null;
    }
    const cached = sourceFileCache.get(fileUrl);
    if (cached !== undefined && cached.mtimeMs === mtimeMs) {
        return cached.sourceFile;
    }
    let sourceFile: ts.SourceFile | null = null;
    try {
        const text = readFileSync(url, 'utf8');
        sourceFile = ts.createSourceFile(fileUrl, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    } catch {
        sourceFile = null;
    }
    sourceFileCache.set(fileUrl, { mtimeMs, sourceFile });
    return sourceFile;
}

type Declaration =
    | { readonly kind: 'const'; readonly statement: ts.VariableStatement }
    | { readonly kind: 'function'; readonly statement: ts.FunctionDeclaration }
    | { readonly kind: 'mutable'; readonly reason: string }
    | { readonly kind: 'import'; readonly binding: ImportBinding }
    | { readonly kind: 'not-found' };

/**
 * Whether a const initializer produces the same value however often it's evaluated, so re-running it in the
 * generated module is safe. A call, `new`, tagged template, or `await` in the eagerly-evaluated portion can
 * yield a different value each time (`Date.now()`, `readFileSync(...)`) — those aren't reproducible. Function
 * and arrow bodies are deferred (not run at declaration time), so their contents don't count.
 */
function initializerIsReproducible(node: ts.Node): boolean {
    let reproducible = true;
    function visit(current: ts.Node): void {
        if (!reproducible) {
            return;
        }
        if (
            ts.isArrowFunction(current) ||
            ts.isFunctionExpression(current) ||
            ts.isMethodDeclaration(current) ||
            ts.isGetAccessorDeclaration(current) ||
            ts.isSetAccessorDeclaration(current)
        ) {
            return;
        }
        if (
            ts.isCallExpression(current) ||
            ts.isNewExpression(current) ||
            ts.isTaggedTemplateExpression(current) ||
            ts.isAwaitExpression(current)
        ) {
            reproducible = false;
            return;
        }
        ts.forEachChild(current, visit);
    }
    visit(node);
    return reproducible;
}

/**
 * Locates the top-level declaration of `name` in `sourceFile` and classifies
 * it as const/function/import/mutable/not-found so the caller can decide
 * whether to inline it, re-emit an import, or surface a `ResolutionError`.
 */
function findDeclaration(sourceFile: ts.SourceFile, name: string): Declaration {
    for (const statement of sourceFile.statements) {
        if (ts.isVariableStatement(statement)) {
            const flags = statement.declarationList.flags;
            const isConst = (flags & ts.NodeFlags.Const) !== 0;
            for (const declaration of statement.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
                    if (!isConst) {
                        return {
                            kind: 'mutable',
                            reason: `'${name}' is declared with let/var; its value can change between schema construction and compile time.`,
                        };
                    }
                    // The whole statement is hoisted and re-evaluated at generated-module load, so every
                    // declarator's initializer must be reproducible — not just the matched one.
                    for (const sibling of statement.declarationList.declarations) {
                        if (sibling.initializer !== undefined && !initializerIsReproducible(sibling.initializer)) {
                            return {
                                kind: 'mutable',
                                reason: `'${name}' comes from a const whose initializer isn't a reproducible constant (it calls a function or constructs a value); re-evaluating it in the generated module could bind a different value.`,
                            };
                        }
                    }
                    return { kind: 'const', statement };
                }
            }
            continue;
        }
        if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) {
            return { kind: 'function', statement };
        }
        if (ts.isImportDeclaration(statement)) {
            const importClause = statement.importClause;
            if (importClause === undefined || importClause.phaseModifier === ts.SyntaxKind.TypeKeyword) {
                continue;
            }
            if (!ts.isStringLiteral(statement.moduleSpecifier)) {
                continue;
            }
            const moduleSpecifier = statement.moduleSpecifier.text;
            if (importClause.name?.text === name) {
                return {
                    kind: 'import',
                    binding: { kind: 'default', local: name, moduleSpecifier },
                };
            }
            const namedBindings = importClause.namedBindings;
            if (namedBindings !== undefined) {
                if (ts.isNamespaceImport(namedBindings) && namedBindings.name.text === name) {
                    return {
                        kind: 'import',
                        binding: { kind: 'namespace', local: name, moduleSpecifier },
                    };
                }
                if (ts.isNamedImports(namedBindings)) {
                    for (const element of namedBindings.elements) {
                        if (element.isTypeOnly) {
                            continue;
                        }
                        if (element.name.text === name) {
                            const imported = element.propertyName?.text ?? element.name.text;
                            return {
                                kind: 'import',
                                binding: { kind: 'named', imported, local: name, moduleSpecifier },
                            };
                        }
                    }
                }
            }
        }
    }
    return { kind: 'not-found' };
}

/**
 * Collects identifier references in `node` that aren't bound within it. A deliberately conservative subset of the
 * scope walker in paseri-lib's _callback.ts — kept separate to avoid leaking that internal into the compiler. It
 * covers the declaration forms hoisted code actually uses (consts, functions, nested functions, blocks) but skips
 * classes, catch clauses, methods/accessors, `var` hoisting, and destructured-parameter defaults. That's safe: an
 * unhandled construct only over-approximates the free set, so a missed binding surfaces as a `ResolutionError`
 * (the schema becomes `unsupported`) — never as wrong generated code.
 */
function collectFreeIdentifiersIn(node: ts.Node): Set<string> {
    const free = new Set<string>();
    const scopeStack: Set<string>[] = [new Set<string>()];

    function declare(name: string): void {
        scopeStack[scopeStack.length - 1].add(name);
    }
    function isBound(name: string): boolean {
        for (let index = scopeStack.length - 1; index >= 0; index--) {
            if (scopeStack[index].has(name)) {
                return true;
            }
        }
        return false;
    }
    function addBindingNames(name: ts.BindingName): void {
        if (ts.isIdentifier(name)) {
            declare(name.text);
            return;
        }
        for (const element of name.elements) {
            if (ts.isBindingElement(element)) {
                addBindingNames(element.name);
            }
        }
    }
    // Destructuring defaults (`{ x = DEFAULT }`, `[x = DEFAULT]`, nested) reference identifiers from the enclosing
    // scope; visit them so they're collected as free. Without this the free set is under-approximated, so a needed
    // declaration is silently not hoisted and the generated module references an undeclared binding.
    function visitBindingDefaults(name: ts.BindingName): void {
        if (ts.isIdentifier(name)) {
            return;
        }
        for (const element of name.elements) {
            if (ts.isBindingElement(element)) {
                if (element.initializer !== undefined) {
                    visit(element.initializer);
                }
                visitBindingDefaults(element.name);
            }
        }
    }
    function enterFunctionLike(functionLike: ts.FunctionLikeDeclaration | ts.ArrowFunction): void {
        scopeStack.push(new Set<string>());
        if (
            (ts.isFunctionExpression(functionLike) || ts.isFunctionDeclaration(functionLike)) &&
            functionLike.name !== undefined
        ) {
            declare(functionLike.name.text);
        }
        for (const parameter of functionLike.parameters) {
            addBindingNames(parameter.name);
            if (parameter.initializer !== undefined) {
                visit(parameter.initializer);
            }
            visitBindingDefaults(parameter.name);
        }
    }

    function visit(current: ts.Node): void {
        if (ts.isPropertyAccessExpression(current)) {
            visit(current.expression);
            return;
        }
        if (ts.isPropertyAssignment(current)) {
            if (ts.isComputedPropertyName(current.name)) {
                visit(current.name.expression);
            }
            visit(current.initializer);
            return;
        }
        if (ts.isShorthandPropertyAssignment(current)) {
            const text = current.name.text;
            if (!isBound(text)) {
                free.add(text);
            }
            return;
        }
        if (ts.isVariableDeclaration(current)) {
            addBindingNames(current.name);
            if (current.initializer !== undefined) {
                visit(current.initializer);
            }
            visitBindingDefaults(current.name);
            return;
        }
        if (ts.isFunctionDeclaration(current)) {
            if (current.name !== undefined) {
                declare(current.name.text);
            }
            enterFunctionLike(current);
            if (current.body !== undefined) {
                visit(current.body);
            }
            scopeStack.pop();
            return;
        }
        if (ts.isFunctionExpression(current) || ts.isArrowFunction(current)) {
            enterFunctionLike(current);
            if (current.body !== undefined) {
                visit(current.body);
            }
            scopeStack.pop();
            return;
        }
        if (ts.isBlock(current)) {
            scopeStack.push(new Set<string>());
            for (const statement of current.statements) {
                if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) {
                    declare(statement.name.text);
                }
            }
            for (const statement of current.statements) {
                visit(statement);
            }
            scopeStack.pop();
            return;
        }
        if (ts.isIdentifier(current)) {
            const text = current.text;
            if (!isBound(text)) {
                free.add(text);
            }
            return;
        }
        ts.forEachChild(current, visit);
    }

    visit(node);
    return free;
}

function statementText(sourceFile: ts.SourceFile, statement: ts.Statement): string {
    return sourceFile.text.substring(statement.getStart(sourceFile), statement.end);
}

/**
 * Resolves an import path against the call site. Relative paths and URLs
 * become absolute URLs so the emitted module can resolve them from any
 * location (paseri-compiler writes generated code to a different directory
 * than the source). Bare specifiers pass through verbatim only when the
 * caller has explicitly trusted them via `toSource(..., { trustedBareSpecifiers })`;
 * untrusted bare specifiers throw at compile time so typos and unverified
 * packages can't silently slip into the generated output.
 */
function resolveSpecifier(specifier: string, callSiteFile: string, trustedBareSpecifiers: ReadonlySet<string>): string {
    if (
        specifier.startsWith('./') ||
        specifier.startsWith('../') ||
        specifier.startsWith('/') ||
        /^[a-z][a-z+\-.]*:\/\//i.test(specifier)
    ) {
        return new URL(specifier, callSiteFile).href;
    }
    if (trustedBareSpecifiers.has(specifier)) {
        return specifier;
    }
    throw new ResolutionError(
        `Bare module specifier '${specifier}' cannot be replicated — paseri-compiler can't verify it'll resolve where the generated module is consumed. Either inline the value into the callback's file, or pass it via toSource(..., { trustedBareSpecifiers: ['${specifier}'] }) if you've verified it.`,
    );
}

function formatImport(binding: ImportBinding, resolvedSpecifier: string): string {
    if (binding.kind === 'default') {
        return `import ${binding.local} from '${resolvedSpecifier}';`;
    }
    if (binding.kind === 'namespace') {
        return `import * as ${binding.local} from '${resolvedSpecifier}';`;
    }
    if (binding.imported === binding.local) {
        return `import { ${binding.local} } from '${resolvedSpecifier}';`;
    }
    return `import { ${binding.imported} as ${binding.local} } from '${resolvedSpecifier}';`;
}

/**
 * Resolves each free identifier in a refine/chain predicate against the call
 * site's source file. Returns the verbatim const/function declarations to
 * hoist and the import statements to prepend to the generated module. Throws
 * `ResolutionError` when an identifier can't be reproduced (mutable binding,
 * missing declaration, untrusted bare specifier, file unreadable).
 */
function resolveBindings(
    callSiteFile: string,
    freeIdentifiers: readonly string[],
    isGlobal: (name: string) => boolean,
    trustedBareSpecifiers: ReadonlySet<string>,
    reservedIdentifiers: ReadonlySet<string>,
): ResolvedBindings {
    const unresolved = freeIdentifiers.filter((name) => !isGlobal(name));
    if (unresolved.length === 0) {
        return { hoists: [], imports: [] };
    }
    const loaded = loadSourceFile(callSiteFile);
    if (loaded === null) {
        throw new ResolutionError(
            `Cannot read source file '${callSiteFile}' to resolve free identifiers [${unresolved.join(', ')}]. Only file:// URLs are supported.`,
        );
    }
    const sourceFile: ts.SourceFile = loaded;

    const visited = new Set<string>();
    const hoistTextByStartPos = new Map<number, string>();
    const imports: string[] = [];

    function visit(name: string): void {
        if (isGlobal(name) || visited.has(name)) {
            return;
        }
        visited.add(name);
        const declaration = findDeclaration(sourceFile, name);
        if (declaration.kind === 'not-found') {
            throw new ResolutionError(
                `Cannot resolve free identifier '${name}' — no top-level declaration found in ${callSiteFile}.`,
            );
        }
        if (declaration.kind === 'mutable') {
            throw new ResolutionError(`Cannot resolve free identifier '${name}': ${declaration.reason}`);
        }
        if (reservedIdentifiers.has(name)) {
            // Hoisting this declaration (or re-emitting its import) would clash with a name the generated module
            // already binds — a runtime helper, the internal import, or an entry function. A const/import clash is a
            // hard SyntaxError; a function clash silently rebinds. Refuse to compile rather than emit broken code.
            throw new ResolutionError(
                `Cannot resolve free identifier '${name}' — it collides with a name the generated module reserves. Rename the binding in ${callSiteFile}.`,
            );
        }
        if (declaration.kind === 'import') {
            const resolvedSpecifier = resolveSpecifier(
                declaration.binding.moduleSpecifier,
                callSiteFile,
                trustedBareSpecifiers,
            );
            const importText = formatImport(declaration.binding, resolvedSpecifier);
            if (!imports.includes(importText)) {
                imports.push(importText);
            }
            return;
        }
        // Scan the ENTIRE hoisted statement, not just the matched declarator: a multi-declarator `const` is emitted
        // whole, so free identifiers in its sibling declarators must be resolved too — otherwise the generated module
        // references a binding that was never hoisted.
        for (const dependency of collectFreeIdentifiersIn(declaration.statement)) {
            visit(dependency);
        }
        const statement = declaration.statement;
        const startPos = statement.getStart(sourceFile);
        hoistTextByStartPos.set(startPos, statementText(sourceFile, statement));
    }

    for (const name of unresolved) {
        visit(name);
    }

    // Preserve source order so declarations are emitted in the same sequence
    // they appear in the user's file — TDZ-correct for chains of `const`s.
    const ordered = Array.from(hoistTextByStartPos.entries())
        .sort(([a], [b]) => a - b)
        .map(([, text]) => text);
    return { hoists: ordered, imports };
}

export { ResolutionError, type ResolvedBindings, resolveBindings };
