import type { IR } from '@paseri/paseri/introspect';
import ts from 'typescript';
import {
    assign,
    binary,
    call,
    constStatement,
    identifier,
    ifStatement,
    not,
    notEquals,
    property,
    returnStatement,
    trueLiteral,
} from '../builders.ts';
import { emitFailureRouting } from '../issues.ts';
import { freshIdentifier, type Sink, type State } from '../state.ts';

type RefIR = Extract<IR, { kind: 'ref' }>;

/**
 * Emits a call to a named lazy/recursive function. Passes through depth
 * tracking (currentDepth, maxDepth) when the graph uses ref nodes. Return-sink
 * returns the call directly; accumulate-sink captures the result and routes
 * failure / writes modifications to the output slot.
 */
function emitRef(ir: RefIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const callArguments: ts.Expression[] = [valueExpression];
    if (state.maxDepthIdentifier !== undefined) {
        callArguments.push(state.currentDepth);
        callArguments.push(state.maxDepthIdentifier);
    }
    const callExpression = call(identifier(ir.name), callArguments);

    if (sink.kind === 'return') {
        return [returnStatement(callExpression)];
    }

    const refResult = freshIdentifier(state, 'refResult');
    const statements: ts.Statement[] = [
        constStatement(refResult, undefined, callExpression),
        ifStatement(not(property(refResult, 'ok')), [emitFailureRouting(property(refResult, 'issue'), sink)]),
    ];

    if (sink.outputSlot !== undefined) {
        const slot = sink.outputSlot;
        statements.push(
            ifStatement(
                binary(
                    property(refResult, 'ok'),
                    ts.SyntaxKind.AmpersandAmpersandToken,
                    notEquals(property(refResult, 'value'), valueExpression),
                ),
                [assign(slot.target, property(refResult, 'value')), assign(slot.isModified, trueLiteral)],
            ),
        );
    }

    return statements;
}

export { emitRef };
