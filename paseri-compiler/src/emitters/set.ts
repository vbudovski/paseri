import type { IR } from '@vbudovski/paseri/introspect';
import ts from 'typescript';
import {
    assign,
    binary,
    block,
    breakStatement,
    call,
    equals,
    expressionStatement,
    falseLiteral,
    identifier,
    ifStatement,
    instanceOf,
    letStatement,
    newExpression,
    not,
    notEquals,
    numericLiteral,
    postfixIncrement,
    property,
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
import { emitDuplicateKeyCheck } from './_collection-checks.ts';

const { factory } = ts;

type SetIR = Extract<IR, { kind: 'set' }>;

function emitSet(ir: SetIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const elementCanModify = modifies(ir.element, state);

    const issueIdentifier = freshIdentifier(state, 'issue');
    const newSetIdentifier = elementCanModify ? freshIdentifier(state, 'newSet') : undefined;
    const bodyStatements: ts.Statement[] = [
        letStatement(issueIdentifier, typeUnion([typeReference('TreeNode'), undefinedType])),
    ];
    if (newSetIdentifier !== undefined) {
        bodyStatements.push(
            letStatement(
                newSetIdentifier,
                typeUnion([factory.createTypeReferenceNode('Set', [unknownType]), undefinedType]),
            ),
        );
    }

    for (const check of ir.checks) {
        const sizeExpression = property(valueExpression, 'size');
        const condition =
            check.name === 'min'
                ? binary(sizeExpression, ts.SyntaxKind.GreaterThanEqualsToken, numericLiteral(check.value))
                : binary(sizeExpression, ts.SyntaxKind.LessThanEqualsToken, numericLiteral(check.value));
        const code = check.name === 'min' ? 'too_short' : 'too_long';
        bodyStatements.push(
            ifStatement(not(condition), [
                assign(issueIdentifier, call(identifier('addIssue'), [issueIdentifier, leafExpression(code)])),
            ]),
        );
    }

    const indexIdentifier = freshIdentifier(state, 'index');
    const elementIdentifier = freshIdentifier(state, 'element');
    bodyStatements.push(letStatement(indexIdentifier, undefined, numericLiteral(0)));

    const modifiedElementIdentifier = elementCanModify ? freshIdentifier(state, 'modifiedElement') : undefined;
    const elementIsModifiedIdentifier = elementCanModify ? freshIdentifier(state, 'elementModified') : undefined;

    const elementSink: Sink =
        elementCanModify && modifiedElementIdentifier !== undefined && elementIsModifiedIdentifier !== undefined
            ? {
                  kind: 'accumulate',
                  issueIdentifier,
                  keyExpression: indexIdentifier,
                  outputSlot: { target: modifiedElementIdentifier, isModified: elementIsModifiedIdentifier },
              }
            : { kind: 'accumulate', issueIdentifier, keyExpression: indexIdentifier };

    const loopBody: ts.Statement[] = [];
    if (modifiedElementIdentifier !== undefined && elementIsModifiedIdentifier !== undefined) {
        loopBody.push(
            letStatement(modifiedElementIdentifier, unknownType, elementIdentifier),
            letStatement(elementIsModifiedIdentifier, undefined, falseLiteral),
        );
    }
    // The element sink shares issueIdentifier with the outer accumulator, so
    // snapshot before validation to detect this iteration's contribution.
    const issueSnapshotIdentifier = elementCanModify ? freshIdentifier(state, 'beforeIssue') : undefined;
    if (issueSnapshotIdentifier !== undefined) {
        loopBody.push(
            letStatement(
                issueSnapshotIdentifier,
                typeUnion([typeReference('TreeNode'), undefinedType]),
                issueIdentifier,
            ),
        );
    }
    loopBody.push(...emitValidation(ir.element, elementIdentifier, elementSink, state));

    if (
        elementCanModify &&
        newSetIdentifier !== undefined &&
        elementIsModifiedIdentifier !== undefined &&
        issueSnapshotIdentifier !== undefined
    ) {
        const lazyInitNewSet = (() => {
            const previousElementIdentifier = freshIdentifier(state, 'prev');
            const previousIndexIdentifier = freshIdentifier(state, 'prevIndex');
            const prefixCopyLoop = factory.createForOfStatement(
                undefined,
                factory.createVariableDeclarationList(
                    [factory.createVariableDeclaration(previousElementIdentifier)],
                    ts.NodeFlags.Const,
                ),
                valueExpression,
                block([
                    ifStatement(
                        binary(previousIndexIdentifier, ts.SyntaxKind.GreaterThanEqualsToken, indexIdentifier),
                        [breakStatement()],
                    ),
                    expressionStatement(call(property(newSetIdentifier, 'add'), [previousElementIdentifier])),
                    expressionStatement(postfixIncrement(previousIndexIdentifier)),
                ]),
            );
            return [
                assign(newSetIdentifier, newExpression(identifier('Set'), undefined, [])),
                letStatement(previousIndexIdentifier, undefined, numericLiteral(0)),
                prefixCopyLoop,
            ];
        })();

        const failedBranch = [
            ifStatement(notEquals(newSetIdentifier, undefinedExpression), [
                expressionStatement(call(property(newSetIdentifier, 'add'), [elementIdentifier])),
            ]),
        ];
        const modifiedSuccessBranch = [
            ifStatement(
                factory.createBinaryExpression(
                    newSetIdentifier,
                    ts.SyntaxKind.EqualsEqualsEqualsToken,
                    undefinedExpression,
                ),
                lazyInitNewSet,
            ),
            expressionStatement(
                call(property(newSetIdentifier, 'add'), [modifiedElementIdentifier ?? elementIdentifier]),
            ),
        ];
        const unmodifiedSuccessBranch = [
            ifStatement(notEquals(newSetIdentifier, undefinedExpression), [
                expressionStatement(call(property(newSetIdentifier, 'add'), [elementIdentifier])),
            ]),
        ];
        loopBody.push(
            ifStatement(
                factory.createBinaryExpression(
                    issueSnapshotIdentifier,
                    ts.SyntaxKind.ExclamationEqualsEqualsToken,
                    issueIdentifier,
                ),
                failedBranch,
                [ifStatement(elementIsModifiedIdentifier, modifiedSuccessBranch, unmodifiedSuccessBranch)],
            ),
        );
    }
    loopBody.push(expressionStatement(postfixIncrement(indexIdentifier)));

    const elementLoop = factory.createForOfStatement(
        undefined,
        factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(elementIdentifier)],
            ts.NodeFlags.Const,
        ),
        valueExpression,
        block(loopBody),
    );
    // Mirror the runtime: a failed size bound short-circuits before element validation, so the issue carries only the
    // single too_short/too_long leaf rather than that leaf plus a per-element issue for every invalid element.
    if (ir.checks.length > 0) {
        bodyStatements.push(ifStatement(equals(issueIdentifier, undefinedExpression), [elementLoop]));
    } else {
        bodyStatements.push(elementLoop);
    }

    bodyStatements.push(
        ifStatement(notEquals(issueIdentifier, undefinedExpression), [emitFailureRouting(issueIdentifier, sink)]),
    );

    if (newSetIdentifier !== undefined) {
        bodyStatements.push(...emitDuplicateKeyCheck(newSetIdentifier, indexIdentifier, sink));
    }

    if (sink.kind === 'return') {
        if (newSetIdentifier !== undefined) {
            bodyStatements.push(
                ifStatement(notEquals(newSetIdentifier, undefinedExpression), [
                    factory.createReturnStatement(successPayload(newSetIdentifier, sink.outputType)),
                ]),
            );
        }
        const trailingSuccess = emitSuccessRouting(sink);
        if (trailingSuccess !== undefined) {
            bodyStatements.push(trailingSuccess);
        }
    } else if (sink.outputSlot !== undefined && newSetIdentifier !== undefined) {
        const slot = sink.outputSlot;
        bodyStatements.push(
            ifStatement(notEquals(newSetIdentifier, undefinedExpression), [
                assign(slot.target, newSetIdentifier),
                assign(slot.isModified, trueLiteral),
            ]),
        );
    }

    return [
        emitTypeCheckedBlock(
            instanceOf(valueExpression, identifier('Set')),
            leafExpression('invalid_type', { expected: stringLiteral('Set') }),
            bodyStatements,
            sink,
        ),
    ];
}

export { emitSet };
