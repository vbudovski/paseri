// Issue construction + sink routing. Per-IR emitters compose these to
// turn a failing check into either an early return (return-sink) or an
// accumulator update (accumulate-sink).

import { issueCodes } from '@vbudovski/paseri/internal';
import type ts from 'typescript';
import {
    asConst,
    assign,
    asType,
    block,
    call,
    castTo,
    identifier,
    ifStatement,
    newExpression,
    not,
    objectLiteral,
    property,
    returnStatement,
    stringLiteral,
    trueLiteral,
} from './builders.ts';
import type { Sink } from './state.ts';

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
 * `@vbudovski/paseri/internal`. Reusing it means `.messages(locale?)` is the runtime's exact implementation, so the
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
 * Routes a failing issue through the active sink: returns from the enclosing
 * function on a return-sink, accumulates into the issue variable on an
 * accumulate-sink.
 */
function emitFailureRouting(issueExpression: ts.Expression, sink: Sink): ts.Statement {
    if (sink.kind === 'return') {
        return returnStatement(failurePayload(issueExpression));
    }
    const wrapped =
        sink.keyExpression !== undefined ? nestExpression(sink.keyExpression, issueExpression) : issueExpression;
    return assign(sink.issueIdentifier, call(identifier('addIssue'), [sink.issueIdentifier, wrapped]));
}

function emitSuccessRouting(sink: Sink): ts.Statement | undefined {
    if (sink.kind === 'return') {
        return returnStatement(successPayload(sink.valueExpression, sink.outputType));
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
    successPayload,
};
