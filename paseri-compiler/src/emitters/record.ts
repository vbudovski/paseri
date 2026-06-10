import type { IR } from '@paseri/paseri/introspect';
import ts from 'typescript';
import {
    assign,
    assignOwnPropertyDynamic,
    call,
    equals,
    falseLiteral,
    identifier,
    ifStatement,
    letStatement,
    notEquals,
    objectLiteral,
    recordAccess,
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

type RecordIR = Extract<IR, { kind: 'record' }>;

/**
 * Emits record validation: for-in loop over input keys, validating each value.
 * When elements modify, accumulates changes into a `modified` object; the
 * success path spreads `{...input, ...modified}` so unchanged keys come from
 * the input and modified keys override. (Contrast array/set/tuple/map which
 * use prefix-copy of a fresh container.)
 */
function emitRecord(ir: RecordIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const issueIdentifier = freshIdentifier(state, 'issue');
    const keyIdentifier = freshIdentifier(state, 'key');
    const valueIdentifier = freshIdentifier(state, 'value');
    const elementCanModify = modifies(ir.element, state);
    const modifiedIdentifier = elementCanModify ? freshIdentifier(state, 'modified') : undefined;
    const hasModifications = elementCanModify ? freshIdentifier(state, 'hasModification') : undefined;
    const elementIsModified = elementCanModify ? freshIdentifier(state, 'elementModified') : undefined;

    const bodyStatements: ts.Statement[] = [
        letStatement(issueIdentifier, typeUnion([typeReference('TreeNode'), undefinedType])),
    ];
    if (modifiedIdentifier) {
        bodyStatements.push(
            letStatement(
                modifiedIdentifier,
                typeUnion([typeReference('Record', [typeReference('string'), unknownType]), undefinedType]),
            ),
        );
    }
    if (hasModifications) {
        bodyStatements.push(letStatement(hasModifications, undefined, falseLiteral));
    }

    const loopBody: ts.Statement[] = [
        letStatement(valueIdentifier, undefined, recordAccess(valueExpression, keyIdentifier)),
    ];
    if (elementIsModified) {
        loopBody.push(letStatement(elementIsModified, undefined, falseLiteral));
    }

    const childSink: Sink =
        elementCanModify && elementIsModified !== undefined
            ? {
                  kind: 'accumulate',
                  issueIdentifier,
                  keyExpression: keyIdentifier,
                  outputSlot: { target: valueIdentifier, isModified: elementIsModified },
              }
            : { kind: 'accumulate', issueIdentifier, keyExpression: keyIdentifier };

    loopBody.push(...emitValidation(ir.element, valueIdentifier, childSink, state));

    if (elementCanModify && elementIsModified && modifiedIdentifier && hasModifications) {
        loopBody.push(
            ifStatement(elementIsModified, [
                ifStatement(equals(modifiedIdentifier, undefinedExpression), [
                    assign(modifiedIdentifier, objectLiteral({})),
                ]),
                assignOwnPropertyDynamic(modifiedIdentifier, keyIdentifier, valueIdentifier),
                assign(hasModifications, trueLiteral),
            ]),
        );
    }

    bodyStatements.push(
        factory.createForInStatement(
            factory.createVariableDeclarationList(
                [factory.createVariableDeclaration(keyIdentifier)],
                ts.NodeFlags.Const,
            ),
            valueExpression,
            factory.createBlock(loopBody, true),
        ),
    );

    bodyStatements.push(
        ifStatement(notEquals(issueIdentifier, undefinedExpression), [emitFailureRouting(issueIdentifier, sink)]),
    );

    if (sink.kind === 'return') {
        if (hasModifications && modifiedIdentifier) {
            const spreadExpression = factory.createObjectLiteralExpression(
                [factory.createSpreadAssignment(valueExpression), factory.createSpreadAssignment(modifiedIdentifier)],
                false,
            );
            bodyStatements.push(
                ifStatement(hasModifications, [returnStatement(successPayload(spreadExpression, sink.outputType))]),
            );
        }
        const trailingSuccess = emitSuccessRouting(sink);
        if (trailingSuccess !== undefined) {
            bodyStatements.push(trailingSuccess);
        }
    } else if (sink.outputSlot !== undefined && hasModifications && modifiedIdentifier) {
        const slot = sink.outputSlot;
        const spreadExpression = factory.createObjectLiteralExpression(
            [factory.createSpreadAssignment(valueExpression), factory.createSpreadAssignment(modifiedIdentifier)],
            false,
        );
        bodyStatements.push(
            ifStatement(hasModifications, [
                assign(slot.target, spreadExpression),
                assign(slot.isModified, trueLiteral),
            ]),
        );
    }

    return [
        emitTypeCheckedBlock(
            call(identifier('isPlainObject'), [valueExpression]),
            leafExpression('invalid_type', { expected: stringLiteral('Record') }),
            bodyStatements,
            sink,
        ),
    ];
}

export { emitRecord };
