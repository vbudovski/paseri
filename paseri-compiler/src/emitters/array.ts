import type { IR } from '@vbudovski/paseri/introspect';
import ts from 'typescript';
import {
    assign,
    binary,
    call,
    elementAccess,
    equals,
    expressionStatement,
    falseLiteral,
    identifier,
    ifStatement,
    letStatement,
    not,
    notEquals,
    numericLiteral,
    postfixIncrement,
    property,
    returnStatement,
    stringLiteral,
    trueLiteral,
    typeReference,
    typeUnion,
    undefinedExpression,
    undefinedType,
    unknownType,
} from '../builders.ts';
import { modifies } from '../can-modify.ts';
import {
    emitFailureRouting,
    emitSuccessRouting,
    emitTypeCheckedBlock,
    leafExpression,
    successPayload,
} from '../issues.ts';
import { freshIdentifier, type Sink, type State } from '../state.ts';
import { emitValidation } from '../toSource.ts';

const { factory } = ts;

type ArrayIR = Extract<IR, { kind: 'array' }>;

/**
 * Emits array validation: min/max length checks then per-element validation
 * in a for-loop. `newArray` is lazily allocated when any element modifies —
 * first modification copies the unchanged prefix via slice; subsequent pushes
 * append.
 */
function emitArray(ir: ArrayIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const issueIdentifier = freshIdentifier(state, 'issue');
    const elementCanModify = modifies(ir.element, state);
    const newArrayIdentifier = elementCanModify ? freshIdentifier(state, 'newArray') : undefined;

    const bodyStatements: ts.Statement[] = [
        letStatement(issueIdentifier, typeUnion([typeReference('TreeNode'), undefinedType])),
    ];
    if (newArrayIdentifier) {
        bodyStatements.push(
            letStatement(newArrayIdentifier, typeUnion([factory.createArrayTypeNode(unknownType), undefinedType])),
        );
    }

    for (const check of ir.checks) {
        const lengthExpression = property(valueExpression, 'length');
        const condition =
            check.name === 'min'
                ? binary(lengthExpression, ts.SyntaxKind.GreaterThanEqualsToken, numericLiteral(check.value))
                : binary(lengthExpression, ts.SyntaxKind.LessThanEqualsToken, numericLiteral(check.value));
        const code = check.name === 'min' ? 'too_short' : 'too_long';
        bodyStatements.push(
            ifStatement(not(condition), [
                assign(issueIdentifier, call(identifier('addIssue'), [issueIdentifier, leafExpression(code)])),
            ]),
        );
    }

    const indexIdentifier = freshIdentifier(state, 'index');
    const elementIdentifier = freshIdentifier(state, 'element');
    const elementIsModified = elementCanModify ? freshIdentifier(state, 'elementModified') : undefined;

    const loopBody: ts.Statement[] = [
        letStatement(elementIdentifier, undefined, elementAccess(valueExpression, indexIdentifier)),
    ];
    if (elementIsModified) {
        loopBody.push(letStatement(elementIsModified, undefined, falseLiteral));
    }

    const childSink: Sink =
        elementCanModify && elementIsModified !== undefined
            ? {
                  kind: 'accumulate',
                  issueIdentifier,
                  keyExpression: indexIdentifier,
                  outputSlot: { target: elementIdentifier, isModified: elementIsModified },
              }
            : { kind: 'accumulate', issueIdentifier, keyExpression: indexIdentifier };

    loopBody.push(...emitValidation(ir.element, elementIdentifier, childSink, state));

    if (elementCanModify && elementIsModified && newArrayIdentifier) {
        // First modification: copy the unchanged prefix into newArray.
        loopBody.push(
            ifStatement(elementIsModified, [
                ifStatement(equals(newArrayIdentifier, undefinedExpression), [
                    assign(
                        newArrayIdentifier,
                        call(property(valueExpression, 'slice'), [numericLiteral(0), indexIdentifier]),
                    ),
                ]),
            ]),
        );
        // Once newArray exists, push the (modified or unchanged) element.
        loopBody.push(
            ifStatement(notEquals(newArrayIdentifier, undefinedExpression), [
                expressionStatement(call(property(newArrayIdentifier, 'push'), [elementIdentifier])),
            ]),
        );
    }

    const elementLoop = factory.createForStatement(
        factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(indexIdentifier, undefined, undefined, numericLiteral(0))],
            ts.NodeFlags.Let,
        ),
        binary(indexIdentifier, ts.SyntaxKind.LessThanToken, property(valueExpression, 'length')),
        postfixIncrement(indexIdentifier),
        factory.createBlock(loopBody, true),
    );
    // Mirror the runtime: a failed length bound short-circuits before element validation, so the issue carries only
    // the single too_short/too_long leaf rather than that leaf plus a per-element issue for every invalid element.
    if (ir.checks.length > 0) {
        bodyStatements.push(ifStatement(equals(issueIdentifier, undefinedExpression), [elementLoop]));
    } else {
        bodyStatements.push(elementLoop);
    }

    const failureBlock = ifStatement(notEquals(issueIdentifier, undefinedExpression), [
        emitFailureRouting(issueIdentifier, sink),
    ]);
    bodyStatements.push(failureBlock);

    if (sink.kind === 'return') {
        if (newArrayIdentifier) {
            bodyStatements.push(
                ifStatement(notEquals(newArrayIdentifier, undefinedExpression), [
                    returnStatement(successPayload(newArrayIdentifier, sink.outputType)),
                ]),
            );
        }
        const trailingSuccess = emitSuccessRouting(sink);
        if (trailingSuccess !== undefined) {
            bodyStatements.push(trailingSuccess);
        }
    } else if (sink.outputSlot !== undefined && newArrayIdentifier) {
        const slot = sink.outputSlot;
        bodyStatements.push(
            ifStatement(notEquals(newArrayIdentifier, undefinedExpression), [
                assign(slot.target, newArrayIdentifier),
                assign(slot.isModified, trueLiteral),
            ]),
        );
    }

    return [
        emitTypeCheckedBlock(
            call(property(identifier('Array'), 'isArray'), [valueExpression]),
            leafExpression('invalid_type', { expected: stringLiteral('array') }),
            bodyStatements,
            sink,
        ),
    ];
}

export { emitArray };
