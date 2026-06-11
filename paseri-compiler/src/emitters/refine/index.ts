import type { IR } from '@paseri/paseri/introspect';
import type ts from 'typescript';
import {
    booleanType,
    call,
    castTo,
    constStatement,
    equals,
    falseLiteral,
    functionType,
    ifStatement,
    letStatement,
    not,
    notEquals,
    numericLiteral,
    returnStatement,
    stringLiteral,
    typeReference,
    typeUnion,
    undefinedExpression,
    undefinedType,
    unknownType,
} from '../../builders.ts';
import { emitType } from '../../emit-type.ts';
import { emitFailureRouting, leafExpression, nestExpression, successPayload } from '../../issues.ts';
import { freshIdentifier, type Sink, type State, valueToExpression } from '../../state.ts';
import { emitValidation } from '../../toSource.ts';
import { getOrCreateCallback } from './callback.ts';

type RefineIR = Extract<IR, { kind: 'refine' }>;

function buildRefineIssue(ir: RefineIR): ts.Expression {
    const leafFields: Record<string, ts.Expression> = {};
    if (ir.params !== undefined) {
        leafFields.params = valueToExpression(ir.params);
    }
    let issue: ts.Expression = leafExpression(ir.code, leafFields);
    for (let index = ir.path.length - 1; index >= 0; index--) {
        const key = ir.path[index];
        const keyExpression = typeof key === 'number' ? numericLiteral(key) : stringLiteral(key);
        issue = nestExpression(keyExpression, issue);
    }
    return issue;
}

function emitRefine(ir: RefineIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    // The predicate receives the inner schema's output. Type the hoisted predicate const with it (so its parameter
    // isn't an implicit `any`), and cast the validated value to it at each call (statically it's `unknown` here, but
    // the inner validation has confirmed it).
    const inputType = emitType(ir.inner);
    const predicateIdentifier = getOrCreateCallback(ir.callback, state, 'refine', functionType(inputType, booleanType));
    const issueExpression = buildRefineIssue(ir);

    // Return sink: validate the inner through a local accumulator that captures the (possibly transformed) value, then
    // run the predicate against it. A naive "emit inner, append the guard" only holds for primitive inners — a
    // container (or `.default()`) inner emits its own trailing `return successPayload(...)` on a return sink, so a
    // guard appended after it would be unreachable and the predicate would silently never run. Routing every
    // return-sink refine through the accumulator keeps the predicate reachable and matches the runtime, which always
    // predicates the base's output. The accumulate-sink path below stays correct as-is: the container threads the
    // same mutable binding as both value and output slot, so an in-place transform is already visible to the guard.
    if (sink.kind === 'return') {
        const innerIssueIdentifier = freshIdentifier(state, 'refineIssue');
        const valueIdentifier = freshIdentifier(state, 'refineValue');
        const modifiedIdentifier = freshIdentifier(state, 'refineModified');
        const innerSink: Sink = {
            kind: 'accumulate',
            issueIdentifier: innerIssueIdentifier,
            keyExpression: undefined,
            outputSlot: { target: valueIdentifier, isModified: modifiedIdentifier },
        };
        return [
            letStatement(innerIssueIdentifier, typeUnion([typeReference('TreeNode'), undefinedType])),
            letStatement(valueIdentifier, unknownType, valueExpression),
            letStatement(modifiedIdentifier, undefined, falseLiteral),
            ...emitValidation(ir.inner, valueIdentifier, innerSink, state),
            ifStatement(
                notEquals(innerIssueIdentifier, undefinedExpression),
                [emitFailureRouting(innerIssueIdentifier, sink)],
                [
                    ifStatement(
                        not(call(predicateIdentifier, [castTo(valueIdentifier, inputType)])),
                        [emitFailureRouting(issueExpression, sink)],
                        [returnStatement(successPayload(valueIdentifier, sink.outputType))],
                    ),
                ],
            ),
        ];
    }

    const innerStatements = emitValidation(ir.inner, valueExpression, sink, state);
    const guard = ifStatement(not(call(predicateIdentifier, [castTo(valueExpression, inputType)])), [
        emitFailureRouting(issueExpression, sink),
    ]);
    // Accumulate sink: the inner check may push an issue and keep going, but
    // we must skip the predicate if it did — the runtime bails on base failure.
    // The snapshot const needs an explicit annotation: inside a container element loop its inferred type is
    // circular through the back-edge narrowing of the issue accumulator it compares against (TS7022).
    const snapshotIdentifier = freshIdentifier(state, 'refineBefore');
    return [
        constStatement(snapshotIdentifier, typeUnion([typeReference('TreeNode'), undefinedType]), sink.issueIdentifier),
        ...innerStatements,
        ifStatement(equals(snapshotIdentifier, sink.issueIdentifier), [guard]),
    ];
}

export { emitRefine, getOrCreateCallback };
