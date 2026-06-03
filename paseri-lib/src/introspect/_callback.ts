import ts from 'typescript';
import type { SerializedCallback } from './ir.ts';

class CallbackAnalysisError extends Error {}

/**
 * Serialises a refine/chain callback into its source, name, arity, parameter names, and free identifiers by parsing
 * `predicate.toString()`. Throws `CallbackAnalysisError` for native/bound functions (`[native code]`) and for source
 * that doesn't parse back into a function.
 */
function analyzeCallback(predicate: (...args: never[]) => unknown): SerializedCallback {
    const source = predicate.toString();
    if (source.includes('[native code]')) {
        throw new CallbackAnalysisError('predicate is a native or bound function');
    }
    const sourceFile = ts.createSourceFile('_callback.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const functionNode = findFunctionNode(sourceFile);
    if (functionNode === undefined) {
        throw new CallbackAnalysisError('predicate.toString() did not yield a parseable function expression');
    }
    return {
        source,
        name: predicate.name,
        arity: predicate.length,
        parameterNames: collectParameterNames(functionNode),
        freeIdentifiers: collectFreeIdentifiers(functionNode),
    };
}

/**
 * Serialises a refine/chain callback, attaching the call-site file when one was captured. The conditional spread
 * keeps `callSiteFile` absent (rather than explicitly `undefined`) so the result satisfies `exactOptionalPropertyTypes`.
 */
function serializeCallback(
    callback: (...args: never[]) => unknown,
    callSiteFile: string | undefined,
): SerializedCallback {
    const analyzed = analyzeCallback(callback);
    return callSiteFile !== undefined ? { ...analyzed, callSiteFile } : analyzed;
}

type FunctionLike = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;

function findFunctionNode(sourceFile: ts.SourceFile): FunctionLike | undefined {
    for (const statement of sourceFile.statements) {
        if (ts.isFunctionDeclaration(statement)) {
            return statement;
        }
        if (ts.isExpressionStatement(statement)) {
            let expression: ts.Expression = statement.expression;
            while (ts.isParenthesizedExpression(expression)) {
                expression = expression.expression;
            }
            if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
                return expression;
            }
        }
    }
    return undefined;
}

function addBindingNames(name: ts.BindingName, out: string[]): void {
    if (ts.isIdentifier(name)) {
        out.push(name.text);
        return;
    }
    for (const element of name.elements) {
        if (ts.isBindingElement(element)) {
            addBindingNames(element.name, out);
        }
    }
}

function collectParameterNames(functionLike: FunctionLike): string[] {
    const names: string[] = [];
    for (const parameter of functionLike.parameters) {
        addBindingNames(parameter.name, names);
    }
    return names;
}

/**
 * Collects every identifier referenced inside the callback that isn't bound within it — i.e. its free variables,
 * which the AOT compiler must resolve against the call site's source. Walks a scope stack mirroring JS lexical
 * scoping (function/block/catch/method scopes, `var`/function-declaration hoisting). Deliberately over-approximates:
 * globals such as `Math` come back as free; the compiler's resolver filters those out.
 */
function collectFreeIdentifiers(functionLike: FunctionLike): string[] {
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
    function declareBinding(name: ts.BindingName): void {
        const names: string[] = [];
        addBindingNames(name, names);
        for (const text of names) {
            declare(text);
        }
    }
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
    function declareParameters(parameters: readonly ts.ParameterDeclaration[]): void {
        for (const parameter of parameters) {
            declareBinding(parameter.name);
            visitBindingDefaults(parameter.name);
            if (parameter.initializer !== undefined) {
                visit(parameter.initializer);
            }
        }
    }
    function enterFunctionScope(node: FunctionLike): void {
        scopeStack.push(new Set<string>());
        if ((ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) && node.name !== undefined) {
            declare(node.name.text);
        }
        declareParameters(node.parameters);
    }
    function hoistInBlock(block: ts.Block | ts.ModuleBlock): void {
        for (const statement of block.statements) {
            if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) {
                declare(statement.name.text);
            }
            if (ts.isVariableStatement(statement)) {
                const isVar = (statement.declarationList.flags & ts.NodeFlags.BlockScoped) === 0;
                if (isVar) {
                    for (const declaration of statement.declarationList.declarations) {
                        declareBinding(declaration.name);
                    }
                }
            }
        }
    }

    function visit(node: ts.Node): void {
        if (ts.isPropertyAccessExpression(node)) {
            visit(node.expression);
            return;
        }
        if (ts.isPropertyAssignment(node)) {
            if (ts.isComputedPropertyName(node.name)) {
                visit(node.name.expression);
            }
            visit(node.initializer);
            return;
        }
        if (ts.isShorthandPropertyAssignment(node)) {
            const text = node.name.text;
            if (!isBound(text)) {
                free.add(text);
            }
            return;
        }
        if (ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
            if (ts.isComputedPropertyName(node.name)) {
                visit(node.name.expression);
            }
            scopeStack.push(new Set<string>());
            declareParameters(node.parameters);
            if (node.body !== undefined) {
                hoistInBlock(node.body);
                for (const statement of node.body.statements) {
                    visit(statement);
                }
            }
            scopeStack.pop();
            return;
        }
        if (ts.isVariableDeclaration(node)) {
            declareBinding(node.name);
            visitBindingDefaults(node.name);
            if (node.initializer !== undefined) {
                visit(node.initializer);
            }
            return;
        }
        if (ts.isFunctionDeclaration(node)) {
            if (node.name !== undefined) {
                declare(node.name.text);
            }
            enterFunctionScope(node);
            if (node.body !== undefined) {
                hoistInBlock(node.body);
                for (const statement of node.body.statements) {
                    visit(statement);
                }
            }
            scopeStack.pop();
            return;
        }
        if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
            enterFunctionScope(node);
            if (node.body !== undefined) {
                if (ts.isBlock(node.body)) {
                    hoistInBlock(node.body);
                    for (const statement of node.body.statements) {
                        visit(statement);
                    }
                } else {
                    visit(node.body);
                }
            }
            scopeStack.pop();
            return;
        }
        if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
            if (node.name !== undefined) {
                declare(node.name.text);
            }
            if (node.heritageClauses !== undefined) {
                for (const clause of node.heritageClauses) {
                    for (const type of clause.types) {
                        visit(type.expression);
                    }
                }
            }
            for (const member of node.members) {
                visit(member);
            }
            return;
        }
        if (ts.isCatchClause(node)) {
            scopeStack.push(new Set<string>());
            if (node.variableDeclaration !== undefined) {
                declareBinding(node.variableDeclaration.name);
            }
            hoistInBlock(node.block);
            for (const statement of node.block.statements) {
                visit(statement);
            }
            scopeStack.pop();
            return;
        }
        if (ts.isBlock(node)) {
            scopeStack.push(new Set<string>());
            hoistInBlock(node);
            for (const statement of node.statements) {
                visit(statement);
            }
            scopeStack.pop();
            return;
        }
        if (ts.isIdentifier(node)) {
            const text = node.text;
            if (!isBound(text)) {
                free.add(text);
            }
            return;
        }
        ts.forEachChild(node, visit);
    }

    enterFunctionScope(functionLike);
    if (functionLike.body !== undefined) {
        if (ts.isBlock(functionLike.body)) {
            hoistInBlock(functionLike.body);
            for (const statement of functionLike.body.statements) {
                visit(statement);
            }
        } else {
            visit(functionLike.body);
        }
    }
    scopeStack.pop();

    return Array.from(free);
}

export { analyzeCallback, CallbackAnalysisError, serializeCallback };
