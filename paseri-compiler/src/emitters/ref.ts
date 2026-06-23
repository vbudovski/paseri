import type { IR } from '@paseri/paseri/introspect';
import ts from 'typescript';
import {
    assign,
    binary,
    call,
    castTo,
    constStatement,
    identifier,
    ifStatement,
    incrementDepth,
    isZeroDepth,
    notEquals,
    property,
    returnStatement,
    trueLiteral,
    typeReference,
    undefinedExpression,
} from '../builders.ts';
import { emitFailureRouting, leafExpression } from '../issues.ts';
import { freshIdentifier, type Sink, type State } from '../state.ts';
import { emitValidation } from '../toSource.ts';

type RefIR = Extract<IR, { kind: 'ref' }>;

/**
 * Inlines an acyclic (forward-reference / shared) ref target at the use site: the runtime's lazy boundary check
 * (`depth >= maxDepth` → `too_deep`, see LazySchema._parse) with a statically-tracked depth, then the target's
 * validation against the caller's own sink — no function call, no result-object allocation. The check is omitted at
 * entry depth 0, where `0 >= maxDepth` can't fire (`maxDepth >= 1` is enforced by the entry's throw guard).
 */
function emitInlinedRef(ir: RefIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const target = state.namedIRs[ir.name];
    const savedDepth = state.currentDepth;
    state.currentDepth = incrementDepth(savedDepth);
    const targetStatements = emitValidation(target, valueExpression, sink, state);
    state.currentDepth = savedDepth;

    if (isZeroDepth(savedDepth) || state.maxDepthIdentifier === undefined) {
        return targetStatements;
    }
    // The runtime returns `too_deep` INSTEAD of validating, so the target goes in the else branch — appending it
    // after the check would still run it under an accumulate sink.
    return [
        ifStatement(
            binary(savedDepth, ts.SyntaxKind.GreaterThanEqualsToken, state.maxDepthIdentifier),
            [emitFailureRouting(leafExpression('too_deep'), sink)],
            targetStatements,
        ),
    ];
}

/**
 * Emits a ref. Acyclic targets inline (see `emitInlinedRef`); cyclic targets call the named lazy/recursive
 * function, passing through depth tracking (currentDepth, maxDepth). Return-sink returns the call directly;
 * accumulate-sink captures the result and routes failure / writes modifications to the output slot.
 */
function emitRef(ir: RefIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    if (!state.cyclicNames.has(ir.name)) {
        return emitInlinedRef(ir, valueExpression, sink, state);
    }
    const callArguments: ts.Expression[] = [valueExpression];
    if (state.maxDepthIdentifier !== undefined) {
        callArguments.push(state.currentDepth);
        callArguments.push(state.maxDepthIdentifier);
    }
    const callExpression = call(identifier(ir.name), callArguments);

    if (sink.kind === 'return') {
        return [returnStatement(callExpression)];
    }

    // The named function returns an `InternalParseResult`: `undefined` (passthrough success), a `{ ok, value }` box
    // (transformed success), or a raw `TreeNode` (failure). Route each into the accumulate sink.
    const refResult = freshIdentifier(state, 'refResult');
    const statements: ts.Statement[] = [constStatement(refResult, undefined, callExpression)];

    if (sink.outputSlot !== undefined) {
        const slot = sink.outputSlot;
        statements.push(
            ifStatement(notEquals(refResult, undefinedExpression), [
                ifStatement(
                    call(identifier('isParseSuccess'), [refResult]),
                    [
                        ifStatement(notEquals(property(refResult, 'value'), valueExpression), [
                            assign(slot.target, property(refResult, 'value')),
                            assign(slot.isModified, trueLiteral),
                        ]),
                    ],
                    [emitFailureRouting(refResult, sink)],
                ),
            ]),
        );
    } else {
        // The target can't modify the value, so a non-`undefined` result is always a failure `TreeNode` — but the
        // function's static type is the full `InternalParseResult`, so cast to narrow off the (unreachable) success box.
        statements.push(
            ifStatement(notEquals(refResult, undefinedExpression), [
                emitFailureRouting(castTo(refResult, typeReference('TreeNode')), sink),
            ]),
        );
    }

    return statements;
}

export { emitRef };
