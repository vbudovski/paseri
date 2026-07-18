// Issue construction + sink routing. Per-IR emitters compose these to
// turn a failing check into either an early return (return-sink) or an
// accumulator update (accumulate-sink).

import { issueCodes } from '@paseri/paseri/internal';
import ts from 'typescript';
import {
    asConst,
    assign,
    asType,
    block,
    call,
    castTo,
    equals,
    identifier,
    ifStatement,
    newExpression,
    not,
    objectLiteral,
    property,
    returnStatement,
    stringLiteral,
    trueLiteral,
    undefinedExpression,
    unknownType,
} from './builders.ts';
import type { Sink } from './state.ts';

const { factory } = ts;

// Built-in codes are emitted as branded `issueCodes.X` references so generated leaves type-check against the
// runtime's `LeafNode` union; unknown (custom refine/chain) codes get a `CustomIssueCode` cast, mirroring `err()`.
const codeToKey = new Map<string, string>(
    Object.entries(issueCodes).map(([key, value]): [string, string] => [value, key]),
);

function codeExpression(code: string): ts.Expression {
    const key = codeToKey.get(code);
    return key !== undefined ? property(identifier('issueCodes'), key) : asType(stringLiteral(code), 'CustomIssueCode');
}

function leafExpression(code: string, fields: Record<string, ts.Expression> = {}): ts.ObjectLiteralExpression {
    return objectLiteral({ type: stringLiteral('leaf'), code: codeExpression(code), ...fields });
}

function nestExpression(keyExpression: ts.Expression, child: ts.Expression): ts.ObjectLiteralExpression {
    return objectLiteral({ type: stringLiteral('nest'), key: keyExpression, child });
}

/**
 * Builds `new ParseErrorResult(issue)` — the runtime's failure result, imported from
 * `@paseri/paseri/internal`. Reusing it means `.messages(locale?)` is the runtime's exact implementation, so the
 * compiled output can't drift from it.
 */
function failurePayload(issueExpression: ts.Expression): ts.Expression {
    return newExpression(identifier('ParseErrorResult'), undefined, [issueExpression]);
}

function successPayload(valueExpression: ts.Expression, outputType: ts.TypeNode): ts.ObjectLiteralExpression {
    // The value is runtime-validated to match the schema's output type, but statically it's wider (`unknown`,
    // `Set<unknown>`, `Record<…>`, …). Cast it to the function's actual output type (not `any`) so it satisfies the
    // typed `ParseResult<OutputType>` return while a grossly-mistyped success value would still be a type error.
    return objectLiteral({ ok: asConst(trueLiteral), value: castTo(valueExpression, outputType) });
}

/**
 * Builds the success-box probe, `(expression as { ok?: unknown }).ok === true`. Inlined rather than calling the
 * runtime's `isParseSuccess` because the inline form benchmarked faster in generated modules; the untyped cast
 * keeps the check valid over the `InternalParseResult` union without narrowing help. Keeps the box's shape
 * defined in one module.
 */
function successProbe(expression: ts.Expression): ts.Expression {
    const probeType = factory.createTypeLiteralNode([
        factory.createPropertySignature(undefined, 'ok', factory.createToken(ts.SyntaxKind.QuestionToken), unknownType),
    ]);

    return equals(property(castTo(expression, probeType), 'ok'), trueLiteral);
}

/**
 * The success box's type, `{ ok: true; value: OutputType }`, for reading `.value` once {@link successProbe} has
 * passed.
 */
function successBoxType(outputType: ts.TypeNode): ts.TypeNode {
    return factory.createTypeLiteralNode([
        factory.createPropertySignature(undefined, 'ok', undefined, factory.createLiteralTypeNode(trueLiteral)),
        factory.createPropertySignature(undefined, 'value', undefined, outputType),
    ]);
}

/**
 * Routes a failing issue through the active sink. On a return-sink the enclosing function returns the raw `TreeNode`
 * directly — the shared validators return `InternalParseResult` (`undefined` | `{ ok, value }` | `TreeNode`), and the
 * thin `safeParse`/`parse` wrappers turn a returned `TreeNode` into a `ParseErrorResult` / thrown `PaseriError`. On an
 * accumulate-sink it appends to the shared issue variable.
 */
function emitFailureRouting(issueExpression: ts.Expression, sink: Sink): ts.Statement {
    if (sink.kind === 'return') {
        return returnStatement(issueExpression);
    }
    const wrapped =
        sink.keyExpression !== undefined ? nestExpression(sink.keyExpression, issueExpression) : issueExpression;
    return assign(sink.issueIdentifier, call(identifier('addIssue'), [sink.issueIdentifier, wrapped]));
}

/**
 * Routes a passthrough success (value unchanged) through the active sink. On a return-sink the function returns
 * `undefined` — the `InternalParseResult` sentinel meaning "valid, value untouched", which the wrappers resolve to the
 * original input. (Transforms that produce a NEW value return `successPayload(...)` explicitly instead.) On an
 * accumulate-sink there's nothing to do.
 */
function emitSuccessRouting(sink: Sink): ts.Statement | undefined {
    if (sink.kind === 'return') {
        return returnStatement(undefinedExpression);
    }
    return undefined;
}

function emitLeafCheck(condition: ts.Expression, leaf: ts.Expression, sink: Sink): ts.Statement {
    return ifStatement(not(condition), [emitFailureRouting(leaf, sink)]);
}

/**
 * Type-check guard that runs `body` only on the success branch. For
 * return-sinks the body falls through after an early return on type
 * failure; for accumulate-sinks the body lives in the else branch.
 */
function emitTypeCheckedBlock(
    typeCondition: ts.Expression,
    typeFailure: ts.Expression,
    body: ts.Statement[],
    sink: Sink,
): ts.Statement {
    if (sink.kind === 'return') {
        return block([ifStatement(not(typeCondition), [emitFailureRouting(typeFailure, sink)]), ...body]);
    }
    return ifStatement(not(typeCondition), [emitFailureRouting(typeFailure, sink)], body);
}

export {
    emitFailureRouting,
    emitLeafCheck,
    emitSuccessRouting,
    emitTypeCheckedBlock,
    failurePayload,
    leafExpression,
    nestExpression,
    successBoxType,
    successPayload,
    successProbe,
};
