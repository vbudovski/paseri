import type { IR } from '@paseri/paseri/introspect';
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
    nestExpression,
    successPayload,
} from '../issues.ts';
import { freshIdentifier, type Sink, type State } from '../state.ts';
import { emitValidation } from '../toSource.ts';
import { emitDuplicateKeyCheck } from './_collection-checks.ts';

const { factory } = ts;

type MapIR = Extract<IR, { kind: 'map' }>;

function emitMap(ir: MapIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const keyCanModify = modifies(ir.key, state);
    const valueCanModify = modifies(ir.value, state);
    const entryCanModify = keyCanModify || valueCanModify;

    const issueIdentifier = freshIdentifier(state, 'issue');
    const newMapIdentifier = entryCanModify ? freshIdentifier(state, 'newMap') : undefined;
    const bodyStatements: ts.Statement[] = [
        letStatement(issueIdentifier, typeUnion([typeReference('TreeNode'), undefinedType])),
    ];
    if (newMapIdentifier !== undefined) {
        bodyStatements.push(
            letStatement(
                newMapIdentifier,
                typeUnion([factory.createTypeReferenceNode('Map', [unknownType, unknownType]), undefinedType]),
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
    const childKeyIdentifier = freshIdentifier(state, 'key');
    const childValueIdentifier = freshIdentifier(state, 'value');
    const childIssueIdentifier = freshIdentifier(state, 'childIssue');
    bodyStatements.push(letStatement(indexIdentifier, undefined, numericLiteral(0)));

    const modifiedKeyIdentifier = keyCanModify ? freshIdentifier(state, 'modifiedKey') : undefined;
    const keyIsModifiedIdentifier = keyCanModify ? freshIdentifier(state, 'keyModified') : undefined;
    const modifiedValueIdentifier = valueCanModify ? freshIdentifier(state, 'modifiedValue') : undefined;
    const valueIsModifiedIdentifier = valueCanModify ? freshIdentifier(state, 'valueModified') : undefined;

    const keySink: Sink =
        keyCanModify && modifiedKeyIdentifier !== undefined && keyIsModifiedIdentifier !== undefined
            ? {
                  kind: 'accumulate',
                  issueIdentifier: childIssueIdentifier,
                  keyExpression: numericLiteral(0),
                  outputSlot: { target: modifiedKeyIdentifier, isModified: keyIsModifiedIdentifier },
              }
            : { kind: 'accumulate', issueIdentifier: childIssueIdentifier, keyExpression: numericLiteral(0) };
    const valueSink: Sink =
        valueCanModify && modifiedValueIdentifier !== undefined && valueIsModifiedIdentifier !== undefined
            ? {
                  kind: 'accumulate',
                  issueIdentifier: childIssueIdentifier,
                  keyExpression: numericLiteral(1),
                  outputSlot: { target: modifiedValueIdentifier, isModified: valueIsModifiedIdentifier },
              }
            : { kind: 'accumulate', issueIdentifier: childIssueIdentifier, keyExpression: numericLiteral(1) };

    const loopBody: ts.Statement[] = [
        letStatement(childIssueIdentifier, typeUnion([typeReference('TreeNode'), undefinedType])),
    ];
    if (modifiedKeyIdentifier !== undefined && keyIsModifiedIdentifier !== undefined) {
        loopBody.push(
            letStatement(modifiedKeyIdentifier, unknownType, childKeyIdentifier),
            letStatement(keyIsModifiedIdentifier, undefined, falseLiteral),
        );
    }
    if (modifiedValueIdentifier !== undefined && valueIsModifiedIdentifier !== undefined) {
        loopBody.push(
            letStatement(modifiedValueIdentifier, unknownType, childValueIdentifier),
            letStatement(valueIsModifiedIdentifier, undefined, falseLiteral),
        );
    }
    loopBody.push(
        ...emitValidation(ir.key, childKeyIdentifier, keySink, state),
        ...emitValidation(ir.value, childValueIdentifier, valueSink, state),
    );

    const childFailedBranch: ts.Statement[] = [];
    if (newMapIdentifier !== undefined) {
        // Mirror paseri-lib runtime: write to newMap even on error iterations so
        // `newMap.size === i` holds post-loop. Otherwise the duplicate-key check
        // (emitDuplicateKeyCheck) would report spurious duplicates whenever an
        // element fails validation.
        childFailedBranch.push(
            ifStatement(notEquals(newMapIdentifier, undefinedExpression), [
                expressionStatement(
                    call(property(newMapIdentifier, 'set'), [childKeyIdentifier, childValueIdentifier]),
                ),
            ]),
        );
    }
    childFailedBranch.push(
        assign(
            issueIdentifier,
            call(identifier('addIssue'), [issueIdentifier, nestExpression(indexIdentifier, childIssueIdentifier)]),
        ),
    );

    let postValidationStatement: ts.Statement;
    if (entryCanModify && newMapIdentifier !== undefined) {
        const lazyInitNewMap = (() => {
            const previousKeyIdentifier = freshIdentifier(state, 'prevKey');
            const previousValueIdentifier = freshIdentifier(state, 'prevValue');
            const previousIndexIdentifier = freshIdentifier(state, 'prevIndex');
            const prefixCopyLoop = factory.createForOfStatement(
                undefined,
                factory.createVariableDeclarationList(
                    [
                        factory.createVariableDeclaration(
                            factory.createArrayBindingPattern([
                                factory.createBindingElement(undefined, undefined, previousKeyIdentifier),
                                factory.createBindingElement(undefined, undefined, previousValueIdentifier),
                            ]),
                        ),
                    ],
                    ts.NodeFlags.Const,
                ),
                valueExpression,
                block([
                    ifStatement(
                        binary(previousIndexIdentifier, ts.SyntaxKind.GreaterThanEqualsToken, indexIdentifier),
                        [breakStatement()],
                    ),
                    expressionStatement(
                        call(property(newMapIdentifier, 'set'), [previousKeyIdentifier, previousValueIdentifier]),
                    ),
                    expressionStatement(postfixIncrement(previousIndexIdentifier)),
                ]),
            );
            return [
                assign(newMapIdentifier, newExpression(identifier('Map'), undefined, [])),
                letStatement(previousIndexIdentifier, undefined, numericLiteral(0)),
                prefixCopyLoop,
            ];
        })();

        const modifiedBranchKeyExpression =
            modifiedKeyIdentifier !== undefined ? modifiedKeyIdentifier : childKeyIdentifier;
        const modifiedBranchValueExpression =
            modifiedValueIdentifier !== undefined ? modifiedValueIdentifier : childValueIdentifier;
        const modifiedBranch: ts.Statement[] = [
            ifStatement(
                factory.createBinaryExpression(
                    newMapIdentifier,
                    ts.SyntaxKind.EqualsEqualsEqualsToken,
                    undefinedExpression,
                ),
                lazyInitNewMap,
            ),
            expressionStatement(
                call(property(newMapIdentifier, 'set'), [modifiedBranchKeyExpression, modifiedBranchValueExpression]),
            ),
        ];
        const unmodifiedBranch: ts.Statement[] = [
            ifStatement(notEquals(newMapIdentifier, undefinedExpression), [
                expressionStatement(
                    call(property(newMapIdentifier, 'set'), [childKeyIdentifier, childValueIdentifier]),
                ),
            ]),
        ];
        let entryModifiedCondition: ts.Expression | undefined;
        if (keyIsModifiedIdentifier !== undefined && valueIsModifiedIdentifier !== undefined) {
            entryModifiedCondition = factory.createBinaryExpression(
                keyIsModifiedIdentifier,
                ts.SyntaxKind.BarBarToken,
                valueIsModifiedIdentifier,
            );
        } else if (keyIsModifiedIdentifier !== undefined) {
            entryModifiedCondition = keyIsModifiedIdentifier;
        } else if (valueIsModifiedIdentifier !== undefined) {
            entryModifiedCondition = valueIsModifiedIdentifier;
        }
        if (entryModifiedCondition === undefined) {
            // Defensive: entryCanModify is true so at least one flag exists.
            throw new Error('emitMap internal: entryCanModify is true but no modified-flag was allocated.');
        }
        postValidationStatement = ifStatement(notEquals(childIssueIdentifier, undefinedExpression), childFailedBranch, [
            ifStatement(entryModifiedCondition, modifiedBranch, unmodifiedBranch),
        ]);
    } else {
        postValidationStatement = ifStatement(notEquals(childIssueIdentifier, undefinedExpression), childFailedBranch);
    }
    loopBody.push(postValidationStatement, expressionStatement(postfixIncrement(indexIdentifier)));

    const pairPattern = factory.createArrayBindingPattern([
        factory.createBindingElement(undefined, undefined, childKeyIdentifier),
        factory.createBindingElement(undefined, undefined, childValueIdentifier),
    ]);
    const entryLoop = factory.createForOfStatement(
        undefined,
        factory.createVariableDeclarationList([factory.createVariableDeclaration(pairPattern)], ts.NodeFlags.Const),
        valueExpression,
        block(loopBody),
    );
    // Mirror the runtime: a failed size bound short-circuits before entry validation, so the issue carries only the
    // single too_short/too_long leaf rather than that leaf plus a per-entry issue for every invalid entry.
    if (ir.checks.length > 0) {
        bodyStatements.push(ifStatement(equals(issueIdentifier, undefinedExpression), [entryLoop]));
    } else {
        bodyStatements.push(entryLoop);
    }

    bodyStatements.push(
        ifStatement(notEquals(issueIdentifier, undefinedExpression), [emitFailureRouting(issueIdentifier, sink)]),
    );

    if (newMapIdentifier !== undefined) {
        bodyStatements.push(...emitDuplicateKeyCheck(newMapIdentifier, indexIdentifier, sink));
    }

    if (sink.kind === 'return') {
        if (newMapIdentifier !== undefined) {
            bodyStatements.push(
                ifStatement(notEquals(newMapIdentifier, undefinedExpression), [
                    factory.createReturnStatement(successPayload(newMapIdentifier, sink.outputType)),
                ]),
            );
        }
        const trailingSuccess = emitSuccessRouting(sink);
        if (trailingSuccess !== undefined) {
            bodyStatements.push(trailingSuccess);
        }
    } else if (sink.outputSlot !== undefined && newMapIdentifier !== undefined) {
        const slot = sink.outputSlot;
        bodyStatements.push(
            ifStatement(notEquals(newMapIdentifier, undefinedExpression), [
                assign(slot.target, newMapIdentifier),
                assign(slot.isModified, trueLiteral),
            ]),
        );
    }

    return [
        emitTypeCheckedBlock(
            instanceOf(valueExpression, identifier('Map')),
            leafExpression('invalid_type', { expected: stringLiteral('Map') }),
            bodyStatements,
            sink,
        ),
    ];
}

export { emitMap };
