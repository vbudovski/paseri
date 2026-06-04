import type { IR } from '@vbudovski/paseri/introspect';
import ts from 'typescript';
import {
    assign,
    binary,
    block,
    breakStatement,
    call,
    elementAccess,
    equals,
    expressionStatement,
    falseLiteral,
    identifier,
    ifStatement,
    labeled,
    letStatement,
    notEquals,
    numericLiteral,
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

type TupleIR = Extract<IR, { kind: 'tuple' }>;

/**
 * Emits tuple validation: length check (too_short / too_long) then per-element
 * validation. Length failures break out via `skipLabel` to skip elementwise
 * validation. `newTuple` is lazily allocated when any element modifies — first
 * modification copies the unchanged prefix via slice; subsequent pushes append.
 */
function emitTuple(ir: TupleIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const issueIdentifier = freshIdentifier(state, 'issue');
    const skipLabel = freshIdentifier(state, 'labelTuple');
    const anyElementCanModify = ir.elements.some((element) => modifies(element, state));
    const newTupleIdentifier = anyElementCanModify ? freshIdentifier(state, 'newTuple') : undefined;

    const bodyStatements: ts.Statement[] = [
        letStatement(issueIdentifier, typeUnion([typeReference('TreeNode'), undefinedType])),
    ];
    if (newTupleIdentifier) {
        bodyStatements.push(
            letStatement(newTupleIdentifier, typeUnion([factory.createArrayTypeNode(unknownType), undefinedType])),
        );
    }

    const inner: ts.Statement[] = [];
    inner.push(
        ifStatement(
            binary(
                property(valueExpression, 'length'),
                ts.SyntaxKind.GreaterThanToken,
                numericLiteral(ir.elements.length),
            ),
            [
                assign(issueIdentifier, call(identifier('addIssue'), [issueIdentifier, leafExpression('too_long')])),
                breakStatement(skipLabel),
            ],
        ),
    );
    inner.push(
        ifStatement(
            binary(
                property(valueExpression, 'length'),
                ts.SyntaxKind.LessThanToken,
                numericLiteral(ir.elements.length),
            ),
            [
                assign(issueIdentifier, call(identifier('addIssue'), [issueIdentifier, leafExpression('too_short')])),
                breakStatement(skipLabel),
            ],
        ),
    );
    for (let i = 0; i < ir.elements.length; i++) {
        const elementIR = ir.elements[i];
        const elementCanModify = modifies(elementIR, state);
        const elementIdentifier = freshIdentifier(state, 'value');
        const elementIsModified = elementCanModify ? freshIdentifier(state, 'elementModified') : undefined;

        inner.push(letStatement(elementIdentifier, undefined, elementAccess(valueExpression, numericLiteral(i))));
        if (elementIsModified) {
            inner.push(letStatement(elementIsModified, undefined, falseLiteral));
        }

        const childSink: Sink =
            elementCanModify && elementIsModified !== undefined
                ? {
                      kind: 'accumulate',
                      issueIdentifier,
                      keyExpression: numericLiteral(i),
                      outputSlot: { target: elementIdentifier, isModified: elementIsModified },
                  }
                : { kind: 'accumulate', issueIdentifier, keyExpression: numericLiteral(i) };

        inner.push(...emitValidation(elementIR, elementIdentifier, childSink, state));

        if (newTupleIdentifier) {
            // Lazy-init newTuple on first modification: copy unchanged prefix.
            if (elementCanModify && elementIsModified) {
                inner.push(
                    ifStatement(elementIsModified, [
                        ifStatement(equals(newTupleIdentifier, undefinedExpression), [
                            assign(
                                newTupleIdentifier,
                                call(property(valueExpression, 'slice'), [numericLiteral(0), numericLiteral(i)]),
                            ),
                        ]),
                    ]),
                );
            }
            inner.push(
                ifStatement(notEquals(newTupleIdentifier, undefinedExpression), [
                    expressionStatement(call(property(newTupleIdentifier, 'push'), [elementIdentifier])),
                ]),
            );
        }
    }
    bodyStatements.push(labeled(skipLabel, block(inner)));

    bodyStatements.push(
        ifStatement(notEquals(issueIdentifier, undefinedExpression), [emitFailureRouting(issueIdentifier, sink)]),
    );

    if (sink.kind === 'return') {
        if (newTupleIdentifier) {
            bodyStatements.push(
                ifStatement(notEquals(newTupleIdentifier, undefinedExpression), [
                    returnStatement(successPayload(newTupleIdentifier, sink.outputType)),
                ]),
            );
        }
        const trailingSuccess = emitSuccessRouting(sink);
        if (trailingSuccess !== undefined) {
            bodyStatements.push(trailingSuccess);
        }
    } else if (sink.outputSlot !== undefined && newTupleIdentifier) {
        const slot = sink.outputSlot;
        bodyStatements.push(
            ifStatement(notEquals(newTupleIdentifier, undefinedExpression), [
                assign(slot.target, newTupleIdentifier),
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

export { emitTuple };
