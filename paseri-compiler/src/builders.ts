// Convenience wrappers around `ts.factory` so that the emitters are less verbose.

import ts from 'typescript';

const { factory } = ts;

function identifier(name: string): ts.Identifier {
    return factory.createIdentifier(name);
}

function stringLiteral(value: string): ts.StringLiteral {
    return factory.createStringLiteral(value);
}

function numericLiteral(value: number): ts.NumericLiteral {
    return factory.createNumericLiteral(value);
}

function bigintLiteral(value: bigint): ts.BigIntLiteral {
    return factory.createBigIntLiteral(`${value.toString()}n`);
}

const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

// Builds an object-literal property name. `__proto__` must be a computed name: written as a plain or string-literal
// key, `{ __proto__: ... }` is the prototype setter rather than an own property, which would silently drop the key
// from an embedded default. Keys that aren't valid identifiers (hyphens, spaces, leading digits, …) are quoted so the
// printer emits valid syntax instead of a bare unquoted name.
function propertyName(key: string): ts.PropertyName {
    if (key === '__proto__') {
        return factory.createComputedPropertyName(factory.createStringLiteral(key));
    }
    if (IDENTIFIER_PATTERN.test(key)) {
        return factory.createIdentifier(key);
    }
    return factory.createStringLiteral(key);
}

function objectLiteral(props: Record<string, ts.Expression>): ts.ObjectLiteralExpression {
    return factory.createObjectLiteralExpression(
        Object.entries(props).map(([k, v]) => factory.createPropertyAssignment(propertyName(k), v)),
        false,
    );
}

function call(callee: ts.Expression, argumentsArray: readonly ts.Expression[]): ts.CallExpression {
    return factory.createCallExpression(callee, undefined, argumentsArray);
}

function property(object: ts.Expression, name: string): ts.PropertyAccessExpression {
    return factory.createPropertyAccessExpression(object, name);
}

function equals(left: ts.Expression, right: ts.Expression): ts.BinaryExpression {
    return factory.createBinaryExpression(left, ts.SyntaxKind.EqualsEqualsEqualsToken, right);
}

function notEquals(left: ts.Expression, right: ts.Expression): ts.BinaryExpression {
    return factory.createBinaryExpression(left, ts.SyntaxKind.ExclamationEqualsEqualsToken, right);
}

function not(expression: ts.Expression): ts.PrefixUnaryExpression {
    return factory.createPrefixUnaryExpression(
        ts.SyntaxKind.ExclamationToken,
        factory.createParenthesizedExpression(expression),
    );
}

function typeofExpression(expression: ts.Expression): ts.TypeOfExpression {
    return factory.createTypeOfExpression(expression);
}

function instanceOf(left: ts.Expression, right: ts.Expression): ts.BinaryExpression {
    return factory.createBinaryExpression(left, factory.createToken(ts.SyntaxKind.InstanceOfKeyword), right);
}

function binary(left: ts.Expression, operator: ts.BinaryOperator, right: ts.Expression): ts.BinaryExpression {
    return factory.createBinaryExpression(left, operator, right);
}

/**
 * Depth expression one level deeper than `expression`. Folds numeric literals so inlined acyclic ref boundaries
 * carry constants (`2`) rather than chains (`0 + 1 + 1`); a dynamic base (a cyclic function's `depth + 1`) gains a
 * `+ 1` term instead.
 */
function incrementDepth(expression: ts.Expression): ts.Expression {
    if (ts.isNumericLiteral(expression)) {
        return numericLiteral(Number(expression.text) + 1);
    }
    return binary(expression, ts.SyntaxKind.PlusToken, numericLiteral(1));
}

/** Whether a depth expression is the statically-known entry depth `0`, where a `>= maxDepth` check can't fire. */
function isZeroDepth(expression: ts.Expression): boolean {
    return ts.isNumericLiteral(expression) && Number(expression.text) === 0;
}

function constStatement(
    name: ts.Identifier | string,
    typeNode: ts.TypeNode | undefined,
    initializer: ts.Expression,
): ts.VariableStatement {
    const nameNode = typeof name === 'string' ? identifier(name) : name;
    return factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(nameNode, undefined, typeNode, initializer)],
            ts.NodeFlags.Const,
        ),
    );
}

function letStatement(
    name: ts.Identifier | string,
    typeNode: ts.TypeNode | undefined,
    initializer?: ts.Expression,
): ts.VariableStatement {
    const nameNode = typeof name === 'string' ? identifier(name) : name;
    return factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(nameNode, undefined, typeNode, initializer)],
            ts.NodeFlags.Let,
        ),
    );
}

function assign(target: ts.Expression, value: ts.Expression): ts.ExpressionStatement {
    return factory.createExpressionStatement(factory.createBinaryExpression(target, ts.SyntaxKind.EqualsToken, value));
}

function block(statements: readonly ts.Statement[]): ts.Block {
    return factory.createBlock(statements, true);
}

function ifStatement(condition: ts.Expression, then: ts.Statement[], elseBlock?: ts.Statement[]): ts.IfStatement {
    return factory.createIfStatement(condition, block(then), elseBlock !== undefined ? block(elseBlock) : undefined);
}

function returnStatement(expression?: ts.Expression): ts.ReturnStatement {
    return factory.createReturnStatement(expression);
}

function typeReference(name: string, typeArguments?: ts.TypeNode[]): ts.TypeReferenceNode {
    return factory.createTypeReferenceNode(name, typeArguments);
}

function typeUnion(types: ts.TypeNode[]): ts.UnionTypeNode {
    return factory.createUnionTypeNode(types);
}

/** A single-parameter function type `(value: <paramType>) => <returnType>`. The parameter name is cosmetic. */
function functionType(paramType: ts.TypeNode, returnType: ts.TypeNode): ts.FunctionTypeNode {
    return factory.createFunctionTypeNode(
        undefined,
        [factory.createParameterDeclaration(undefined, undefined, 'value', undefined, paramType)],
        returnType,
    );
}

const undefinedType: ts.KeywordTypeNode = factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword);
const unknownType: ts.KeywordTypeNode = factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
const booleanType: ts.KeywordTypeNode = factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
const trueLiteral: ts.TrueLiteral = factory.createTrue();
const falseLiteral: ts.FalseLiteral = factory.createFalse();
const undefinedExpression: ts.Identifier = identifier('undefined');
const nullExpression: ts.NullLiteral = factory.createNull();

function asConst(expression: ts.Expression): ts.AsExpression {
    return factory.createAsExpression(expression, factory.createTypeReferenceNode('const'));
}

function asType(expression: ts.Expression, typeName: string): ts.AsExpression {
    return factory.createAsExpression(expression, factory.createTypeReferenceNode(typeName));
}

function castTo(expression: ts.Expression, type: ts.TypeNode): ts.AsExpression {
    return factory.createAsExpression(expression, type);
}

function newExpression(
    expression: ts.Expression,
    typeArguments: ts.TypeNode[] | undefined,
    argumentsArray: ts.Expression[],
): ts.NewExpression {
    return factory.createNewExpression(expression, typeArguments, argumentsArray);
}

function postfixIncrement(operand: ts.Expression): ts.PostfixUnaryExpression {
    return factory.createPostfixIncrement(operand);
}

function elementAccess(object: ts.Expression, index: ts.Expression): ts.ElementAccessExpression {
    return factory.createElementAccessExpression(object, index);
}

// Keyed access on the validated value (typed `unknown`, which isn't indexable). The cast erases at runtime — emitted
// JS is a bare `value[key]` — so it exists only to make the generated source type-check. The element type is
// `unknown`, not `any`: every per-kind check narrows the field with a `typeof`/`instanceof` guard before use, and
// nested fields go to sub-validators that take `unknown`. Consumer-facing precision comes from the return type, not
// the body.
const recordType: ts.TypeNode = factory.createTypeReferenceNode('Record', [
    factory.createTypeReferenceNode('PropertyKey'),
    factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
]);

function recordAccess(object: ts.Expression, index: ts.Expression): ts.ElementAccessExpression {
    return factory.createElementAccessExpression(factory.createAsExpression(object, recordType), index);
}

// `<expr> as Record<PropertyKey, unknown>` — erases at runtime. Used to type output clones/spreads of the validated value.
function recordCast(object: ts.Expression): ts.AsExpression {
    return factory.createAsExpression(object, recordType);
}

function arrowFunction(body: ts.Block | ts.Expression): ts.ArrowFunction {
    return factory.createArrowFunction(undefined, undefined, [], undefined, undefined, body);
}

function labeled(label: ts.Identifier, statement: ts.Statement): ts.LabeledStatement {
    return factory.createLabeledStatement(label, statement);
}

function breakStatement(label?: ts.Identifier): ts.BreakStatement {
    return factory.createBreakStatement(label);
}

function continueStatement(): ts.ContinueStatement {
    return factory.createContinueStatement();
}

function switchStatement(expression: ts.Expression, clauses: ts.CaseOrDefaultClause[]): ts.SwitchStatement {
    return factory.createSwitchStatement(expression, factory.createCaseBlock(clauses));
}

function caseClause(value: ts.Expression, statements: ts.Statement[]): ts.CaseClause {
    return factory.createCaseClause(value, statements);
}

function defaultClause(statements: ts.Statement[]): ts.DefaultClause {
    return factory.createDefaultClause(statements);
}

function forIn(name: ts.Identifier, iterable: ts.Expression, body: ts.Statement[]): ts.ForInStatement {
    const declaration = factory.createVariableDeclarationList(
        [factory.createVariableDeclaration(name)],
        ts.NodeFlags.Const,
    );
    return factory.createForInStatement(declaration, iterable, block(body));
}

function forOf(name: ts.Identifier, iterable: ts.Expression, body: ts.Statement[]): ts.ForOfStatement {
    const declaration = factory.createVariableDeclarationList(
        [factory.createVariableDeclaration(name)],
        ts.NodeFlags.Const,
    );
    return factory.createForOfStatement(undefined, declaration, iterable, block(body));
}

function ternary(
    condition: ts.Expression,
    whenTrue: ts.Expression,
    whenFalse: ts.Expression,
): ts.ConditionalExpression {
    return factory.createConditionalExpression(condition, undefined, whenTrue, undefined, whenFalse);
}

function negative(literal: ts.NumericLiteral): ts.PrefixUnaryExpression {
    return factory.createPrefixUnaryExpression(ts.SyntaxKind.MinusToken, literal);
}

function expressionStatement(expression: ts.Expression): ts.ExpressionStatement {
    return factory.createExpressionStatement(expression);
}

function literalExpression(value: string | number | bigint | boolean): ts.Expression {
    if (typeof value === 'bigint') {
        return bigintLiteral(value);
    }
    if (typeof value === 'number') {
        if (Number.isNaN(value)) {
            return property(identifier('Number'), 'NaN');
        }
        // `-0 < 0` is false, so without this it falls through to `numericLiteral(-0)`, which prints `0` — losing the
        // sign that `structuredClone` preserves at runtime.
        if (Object.is(value, -0)) {
            return negative(numericLiteral(0));
        }
        if (value < 0) {
            return negative(numericLiteral(-value));
        }
        return numericLiteral(value);
    }
    if (typeof value === 'boolean') {
        return value ? trueLiteral : falseLiteral;
    }
    return stringLiteral(value);
}

function primitiveToString(value: string | number | bigint | boolean): string {
    if (typeof value === 'bigint') {
        return `${value}n`;
    }
    if (typeof value === 'string') {
        return `'${value}'`;
    }
    return String(value);
}

/**
 * Statement assigning an own data property under a statically-known key. A bare `target["__proto__"] = v`
 * invokes the inherited Object.prototype setter in Annex B environments (browsers, Node.js), so that one
 * key is written with `Object.defineProperty` instead.
 */
function assignOwnProperty(target: ts.Expression, key: string, value: ts.Expression): ts.Statement {
    if (key !== '__proto__') {
        return assign(elementAccess(target, stringLiteral(key)), value);
    }
    return expressionStatement(
        call(property(identifier('Object'), 'defineProperty'), [
            target,
            stringLiteral(key),
            objectLiteral({ value, writable: trueLiteral, enumerable: trueLiteral, configurable: trueLiteral }),
        ]),
    );
}

/**
 * Statement assigning an own data property under a runtime key (loop variable): emits a `__proto__` guard
 * choosing `Object.defineProperty` over plain assignment. See `assignOwnProperty`.
 */
function assignOwnPropertyDynamic(target: ts.Expression, key: ts.Expression, value: ts.Expression): ts.Statement {
    return ifStatement(
        equals(key, stringLiteral('__proto__')),
        [
            expressionStatement(
                call(property(identifier('Object'), 'defineProperty'), [
                    target,
                    key,
                    objectLiteral({
                        value,
                        writable: trueLiteral,
                        enumerable: trueLiteral,
                        configurable: trueLiteral,
                    }),
                ]),
            ),
        ],
        [assign(elementAccess(target, key), value)],
    );
}

export {
    arrowFunction,
    asConst,
    assign,
    assignOwnProperty,
    assignOwnPropertyDynamic,
    asType,
    bigintLiteral,
    binary,
    block,
    booleanType,
    breakStatement,
    call,
    caseClause,
    castTo,
    constStatement,
    continueStatement,
    defaultClause,
    elementAccess,
    equals,
    expressionStatement,
    falseLiteral,
    forIn,
    forOf,
    functionType,
    identifier,
    ifStatement,
    incrementDepth,
    instanceOf,
    isZeroDepth,
    labeled,
    letStatement,
    literalExpression,
    negative,
    newExpression,
    not,
    notEquals,
    nullExpression,
    numericLiteral,
    objectLiteral,
    postfixIncrement,
    primitiveToString,
    property,
    recordAccess,
    recordCast,
    recordType,
    returnStatement,
    stringLiteral,
    switchStatement,
    ternary,
    trueLiteral,
    typeofExpression,
    typeReference,
    typeUnion,
    undefinedExpression,
    undefinedType,
    unknownType,
};
