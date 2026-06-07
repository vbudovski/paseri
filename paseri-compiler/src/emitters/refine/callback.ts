import type { SerializedCallback } from '@vbudovski/paseri/introspect';
import ts from 'typescript';
import { ResolutionError, resolveBindings } from '../../resolver.ts';
import { freshIdentifier, type State } from '../../state.ts';

// Names always available in any JS host. Free references to these don't
// require source-file resolution.
const GLOBAL_BUILTINS = new Set<string>([
    'Number',
    'String',
    'Boolean',
    'Array',
    'Object',
    'Math',
    'JSON',
    'Date',
    'RegExp',
    'Map',
    'Set',
    'Symbol',
    'BigInt',
    'Promise',
    'Error',
    'TypeError',
    'RangeError',
    'SyntaxError',
    'Infinity',
    'NaN',
    'undefined',
    'null',
    'console',
    'globalThis',
    'Reflect',
    'Proxy',
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
    'Temporal',
]);

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

interface ResolvedCallback {
    readonly source: ts.SourceFile;
    readonly expression: ts.Expression;
    // Verbatim user-source declarations (in TDZ-correct order) that need to be
    // hoisted into the generated module so the predicate's free references resolve.
    readonly hoists: readonly string[];
    // Import statements replicating the user's imports for any identifier that
    // resolved to an imported binding.
    readonly imports: readonly string[];
}

/**
 * Resolves a callback's source into an emittable expression plus the hoists and imports its free identifiers need.
 * Free identifiers outside `GLOBAL_BUILTINS` are resolved against the captured call site (throwing `ResolutionError`
 * when none was captured); the parsed source is then narrowed to a function declaration (rewritten as a function
 * expression) or an expression statement (unwrapping any enclosing parentheses).
 */
function resolveCallback(callback: SerializedCallback, state: State): ResolvedCallback {
    let hoists: readonly string[] = [];
    let imports: readonly string[] = [];
    const unresolved = callback.freeIdentifiers.filter((name) => !GLOBAL_BUILTINS.has(name));
    if (unresolved.length > 0) {
        if (callback.callSiteFile === undefined) {
            throw new ResolutionError(
                `Cannot resolve free identifiers [${unresolved.join(', ')}] in refine/chain callback — no call site was captured. Construct the schema in a file:// module so paseri-compiler can scan it.`,
            );
        }
        const resolved = resolveBindings(
            callback.callSiteFile,
            callback.freeIdentifiers,
            (name) => GLOBAL_BUILTINS.has(name),
            state.trustedBareSpecifiers,
            state.reservedIdentifiers,
        );
        hoists = resolved.hoists;
        imports = resolved.imports;
    }
    const source = ts.createSourceFile('_callback.ts', callback.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    if (source.statements.length === 0) {
        throw new ResolutionError('Empty callback source.');
    }
    const statement = source.statements[0];
    if (ts.isFunctionDeclaration(statement) && statement.body !== undefined) {
        return {
            source,
            expression: ts.factory.createFunctionExpression(
                undefined,
                statement.asteriskToken,
                statement.name,
                statement.typeParameters,
                statement.parameters,
                statement.type,
                statement.body,
            ),
            hoists,
            imports,
        };
    }
    if (ts.isExpressionStatement(statement)) {
        let expression: ts.Expression = statement.expression;
        while (ts.isParenthesizedExpression(expression)) {
            expression = expression.expression;
        }
        return { source, expression, hoists, imports };
    }
    throw new ResolutionError(`Unsupported callback source shape (statement kind ${statement.kind}).`);
}

/**
 * Pretty-prints the callback expression using its own source file as context, then stashes a
 * `const <name>: <signatureType> = <text>;` text-hoist on State, preceded by any user-source declarations the resolver
 * pulled in to satisfy free identifiers. We avoid embedding the parsed node into the validator AST directly: the
 * printer would extract text using the node's original positions against the wrong SourceFile, producing garbage.
 *
 * The `signatureType` annotation gives the (verbatim, untyped) callback its parameter type by contextual typing — the
 * user wrote e.g. `(value) => …` relying on `.refine()`'s inference, which is lost once hoisted standalone; without
 * the annotation the parameter would be an implicit `any` and the generated module wouldn't type-check.
 */
function hoistCallback(
    state: State,
    prefix: string,
    resolved: ResolvedCallback,
    signatureType: ts.TypeNode,
): ts.Identifier {
    for (const text of resolved.imports) {
        if (!state.importHoists.includes(text)) {
            state.importHoists.push(text);
        }
    }
    for (const text of resolved.hoists) {
        if (!state.textHoists.includes(text)) {
            state.textHoists.push(text);
        }
    }
    const identifier = freshIdentifier(state, prefix);
    const expressionText = printer.printNode(ts.EmitHint.Unspecified, resolved.expression, resolved.source);
    const typeText = printer.printNode(ts.EmitHint.Unspecified, signatureType, resolved.source);
    state.textHoists.push(`const ${identifier.text}: ${typeText} = ${expressionText};`);
    return identifier;
}

/**
 * Resolves and hoists a callback once per `SerializedCallback` object identity.
 * The shape-entry path and the slow accumulator may both reach the same refine
 * IR node — without this dedup they'd hoist two identical predicate `const`s
 * at module scope. `signatureType` is the callback's function type (`(value: In) => boolean` for refine,
 * `(value: From) => ParseResult<To>` for chain) — see `hoistCallback`.
 */
function getOrCreateCallback(
    callback: SerializedCallback,
    state: State,
    prefix: string,
    signatureType: ts.TypeNode,
): ts.Identifier {
    const cached = state.callbackCache.get(callback);
    if (cached !== undefined) {
        return cached;
    }
    const resolved = resolveCallback(callback, state);
    const identifier = hoistCallback(state, prefix, resolved, signatureType);
    state.callbackCache.set(callback, identifier);
    return identifier;
}

export { getOrCreateCallback };
