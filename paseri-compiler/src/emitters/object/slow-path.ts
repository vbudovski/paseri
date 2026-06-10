import ts from 'typescript';
import {
    assign,
    binary,
    breakStatement,
    call,
    caseClause,
    constStatement,
    continueStatement,
    defaultClause,
    elementAccess,
    equals,
    expressionStatement,
    falseLiteral,
    forIn,
    forOf,
    identifier,
    ifStatement,
    letStatement,
    newExpression,
    not,
    notEquals,
    objectLiteral,
    property,
    recordAccess,
    recordCast,
    recordType,
    returnStatement,
    stringLiteral,
    switchStatement,
    ternary,
    trueLiteral,
    typeReference,
    typeUnion,
    undefinedExpression,
    undefinedType,
    unknownType,
} from '../../builders.ts';
import { modifies } from '../../can-modify.ts';
import {
    emitFailureRouting,
    emitSuccessRouting,
    leafExpression,
    nestExpression,
    successPayload,
} from '../../issues.ts';
import { freshIdentifier, registerDefault, type Sink, type State } from '../../state.ts';
import { emitValidation } from '../../toSource.ts';
import { isFieldOptional, type ObjectIR, safeIdentifier } from './common.ts';

/**
 * Slow path: `for..in` loop with switch dispatch over field names. Used when
 * any field can modify its value or any field name collides with Object.prototype.
 * Handles strip/strict modes by tracking unrecognised keys in a Set, then
 * either emitting `unrecognized_key` issues (strict) or building a sanitised
 * output (strip).
 */
function emitObjectSlowPath(ir: ObjectIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const fields = Object.entries(ir.fields);
    const mode = ir.mode;
    const trackUnrecognized = mode === 'strict' || mode === 'strip';
    const needsMissing = fields.some(([, fieldIR]) => !isFieldOptional(fieldIR));
    // Need the modification map when any child can modify OR strip mode is active
    // (strip rebuilds when unrecognised keys are present).
    const fieldModifies = new Map<string, boolean>(fields.map(([name, fieldIR]) => [name, modifies(fieldIR, state)]));
    const mayModify = mode === 'strip' || [...fieldModifies.values()].some(Boolean);

    const issueIdentifier = freshIdentifier(state, 'issue');
    const modifiedIdentifier = mayModify ? freshIdentifier(state, 'modified') : undefined;
    const hasModifications = mayModify ? freshIdentifier(state, 'hasModification') : undefined;
    // Where modifications accumulate. Non-strip modes clone `{...value}` once and write modified fields directly
    // into it, returning it as the result — one spread instead of building a separate `modified` map and then
    // spreading `{...value, ...modified}`. Strip mode keeps an empty `{}` map: its sanitiser rebuilds the output
    // without extras and reads `modified` per-key, so it can't start from a full clone of `value`.
    const modifiedInit = (): ts.Expression =>
        mode === 'strip'
            ? objectLiteral({})
            : ts.factory.createObjectLiteralExpression(
                  [ts.factory.createSpreadAssignment(recordCast(valueExpression))],
                  false,
              );
    const finalModified = (modified: ts.Identifier): ts.Expression =>
        mode === 'strip'
            ? ts.factory.createObjectLiteralExpression(
                  [
                      ts.factory.createSpreadAssignment(recordCast(valueExpression)),
                      ts.factory.createSpreadAssignment(modified),
                  ],
                  false,
              )
            : modified;
    // Per-field presence flags are enough on their own for missing-key detection;
    // a separate count gives no measurable benefit and costs an increment per
    // iteration of the dispatch loop.
    const unrecognizedIdentifier = trackUnrecognized ? freshIdentifier(state, 'unrecognized') : undefined;
    const seenFieldIdentifiers: Record<string, ts.Identifier> = {};
    if (needsMissing) {
        for (const [fieldName, fieldIR] of fields) {
            if (isFieldOptional(fieldIR)) {
                continue;
            }
            seenFieldIdentifiers[fieldName] = freshIdentifier(state, `seen_${safeIdentifier(fieldName)}`);
        }
    }

    const stateStatements: ts.Statement[] = [
        letStatement(issueIdentifier, typeUnion([typeReference('TreeNode'), undefinedType])),
    ];
    if (modifiedIdentifier) {
        stateStatements.push(
            letStatement(
                modifiedIdentifier,
                typeUnion([typeReference('Record', [typeReference('string'), unknownType]), undefinedType]),
            ),
        );
    }
    if (hasModifications) {
        stateStatements.push(letStatement(hasModifications, undefined, falseLiteral));
    }
    if (unrecognizedIdentifier) {
        stateStatements.push(
            letStatement(
                unrecognizedIdentifier,
                typeUnion([typeReference('Set', [typeReference('string')]), undefinedType]),
            ),
        );
    }
    for (const seenFieldIdentifier of Object.values(seenFieldIdentifiers)) {
        stateStatements.push(letStatement(seenFieldIdentifier, undefined, falseLiteral));
    }

    const keyIdentifier = freshIdentifier(state, 'key');
    const clauses: ts.CaseOrDefaultClause[] = [];

    for (const [fieldName, fieldIR] of fields) {
        const seenFieldIdentifier = seenFieldIdentifiers[fieldName];
        const fieldIdentifier = freshIdentifier(state, 'value');
        const childCanModify = fieldModifies.get(fieldName) === true;
        const fieldIsModified = childCanModify ? freshIdentifier(state, 'fieldModified') : undefined;

        const caseBody: ts.Statement[] = [];
        if (seenFieldIdentifier) {
            caseBody.push(assign(seenFieldIdentifier, trueLiteral));
        }
        // Use the literal field name for the property access. V8 inline-caches
        // `value["fieldName"]` like a dot-access on a stable shape; the dynamic
        // `value[loopKey]` form forces a generic lookup per iteration.
        caseBody.push(
            letStatement(fieldIdentifier, undefined, recordAccess(valueExpression, stringLiteral(fieldName))),
        );
        if (fieldIsModified) {
            caseBody.push(letStatement(fieldIsModified, undefined, falseLiteral));
        }

        const childSink: Sink =
            childCanModify && fieldIsModified !== undefined
                ? {
                      kind: 'accumulate',
                      issueIdentifier,
                      keyExpression: stringLiteral(fieldName),
                      outputSlot: { target: fieldIdentifier, isModified: fieldIsModified },
                  }
                : { kind: 'accumulate', issueIdentifier, keyExpression: stringLiteral(fieldName) };

        caseBody.push(...emitValidation(fieldIR, fieldIdentifier, childSink, state));

        if (childCanModify && fieldIsModified && modifiedIdentifier && hasModifications) {
            // Collect the child's modified value into the parent's `modified` map.
            caseBody.push(
                ifStatement(fieldIsModified, [
                    ifStatement(equals(modifiedIdentifier, undefinedExpression), [
                        assign(modifiedIdentifier, modifiedInit()),
                    ]),
                    assign(elementAccess(modifiedIdentifier, stringLiteral(fieldName)), fieldIdentifier),
                    assign(hasModifications, trueLiteral),
                ]),
            );
        }

        caseBody.push(breakStatement());
        clauses.push(caseClause(stringLiteral(fieldName), caseBody));
    }

    if (trackUnrecognized && unrecognizedIdentifier) {
        clauses.push(
            defaultClause([
                ifStatement(equals(unrecognizedIdentifier, undefinedExpression), [
                    assign(unrecognizedIdentifier, newExpression(identifier('Set'), undefined, [])),
                ]),
                expressionStatement(call(property(unrecognizedIdentifier, 'add'), [keyIdentifier])),
            ]),
        );
    }

    const dispatchLoop = forIn(keyIdentifier, valueExpression, [switchStatement(keyIdentifier, clauses)]);

    const missingStatements: ts.Statement[] = [];
    if (needsMissing) {
        for (const [fieldName, fieldIR] of fields) {
            if (isFieldOptional(fieldIR)) {
                continue;
            }
            const seenFieldIdentifier = seenFieldIdentifiers[fieldName];
            if (fieldIR.kind === 'default' && modifiedIdentifier && hasModifications) {
                const defaultIdentifier = registerDefault(state, fieldIR.value);
                missingStatements.push(
                    ifStatement(not(seenFieldIdentifier), [
                        ifStatement(equals(modifiedIdentifier, undefinedExpression), [
                            assign(modifiedIdentifier, modifiedInit()),
                        ]),
                        assign(elementAccess(modifiedIdentifier, stringLiteral(fieldName)), defaultIdentifier),
                        assign(hasModifications, trueLiteral),
                    ]),
                );
            } else {
                missingStatements.push(
                    ifStatement(not(seenFieldIdentifier), [
                        assign(
                            issueIdentifier,
                            call(identifier('addIssue'), [
                                issueIdentifier,
                                nestExpression(stringLiteral(fieldName), leafExpression('missing_value')),
                            ]),
                        ),
                    ]),
                );
            }
        }
    }
    let strictBlock: ts.Statement | undefined;
    if (mode === 'strict' && unrecognizedIdentifier) {
        const innerKey = freshIdentifier(state, 'unrecognizedKey');
        strictBlock = ifStatement(notEquals(unrecognizedIdentifier, undefinedExpression), [
            forOf(innerKey, unrecognizedIdentifier, [
                assign(
                    issueIdentifier,
                    call(identifier('addIssue'), [
                        issueIdentifier,
                        nestExpression(innerKey, leafExpression('unrecognized_key')),
                    ]),
                ),
            ]),
        ]);
    }

    const failureBlock = ifStatement(notEquals(issueIdentifier, undefinedExpression), [
        emitFailureRouting(issueIdentifier, sink),
    ]);

    // Compute the final output expression: sanitised for strip + unrecognised keys, spread for
    // strict/passthrough + modifications, original otherwise.
    const sanitizedIdentifier = freshIdentifier(state, 'sanitized');
    const buildSanitized = (innerKey: ts.Identifier, unrecognized: ts.Identifier): ts.Statement[] => {
        const assignment =
            hasModifications && modifiedIdentifier
                ? assign(
                      elementAccess(sanitizedIdentifier, innerKey),
                      ternary(
                          binary(
                              hasModifications,
                              ts.SyntaxKind.AmpersandAmpersandToken,
                              call(property(identifier('Object'), 'hasOwn'), [
                                  recordCast(modifiedIdentifier),
                                  innerKey,
                              ]),
                          ),
                          recordAccess(modifiedIdentifier, innerKey),
                          recordAccess(valueExpression, innerKey),
                      ),
                  )
                : assign(elementAccess(sanitizedIdentifier, innerKey), recordAccess(valueExpression, innerKey));
        const statements: ts.Statement[] = [
            constStatement(sanitizedIdentifier, recordType, objectLiteral({})),
            forIn(innerKey, valueExpression, [
                ifStatement(call(property(unrecognized, 'has'), [innerKey]), [continueStatement()]),
                assignment,
            ]),
        ];
        if (hasModifications && modifiedIdentifier) {
            // Default fills target keys absent from the input, so the loop above never copies them.
            const modifiedKey = freshIdentifier(state, 'modifiedKey');
            statements.push(
                ifStatement(
                    binary(
                        hasModifications,
                        ts.SyntaxKind.AmpersandAmpersandToken,
                        notEquals(modifiedIdentifier, undefinedExpression),
                    ),
                    [
                        forIn(modifiedKey, modifiedIdentifier, [
                            ifStatement(
                                not(
                                    call(property(identifier('Object'), 'hasOwn'), [
                                        recordCast(valueExpression),
                                        modifiedKey,
                                    ]),
                                ),
                                [
                                    assign(
                                        elementAccess(sanitizedIdentifier, modifiedKey),
                                        recordAccess(modifiedIdentifier, modifiedKey),
                                    ),
                                ],
                            ),
                        ]),
                    ],
                ),
            );
        }
        return statements;
    };

    const successStatements: ts.Statement[] = [];
    if (sink.kind === 'return') {
        if (mode === 'strip' && unrecognizedIdentifier) {
            const innerKey = freshIdentifier(state, 'sanitizedKey');
            successStatements.push(
                ifStatement(notEquals(unrecognizedIdentifier, undefinedExpression), [
                    ...buildSanitized(innerKey, unrecognizedIdentifier),
                    returnStatement(successPayload(sanitizedIdentifier, sink.outputType)),
                ]),
            );
        }
        const trailingSuccess = emitSuccessRouting(sink);
        if (hasModifications && modifiedIdentifier) {
            successStatements.push(
                ifStatement(
                    hasModifications,
                    [returnStatement(successPayload(finalModified(modifiedIdentifier), sink.outputType))],
                    trailingSuccess !== undefined ? [trailingSuccess] : [],
                ),
            );
        } else if (trailingSuccess !== undefined) {
            successStatements.push(trailingSuccess);
        }
    } else if (sink.outputSlot !== undefined) {
        const slot = sink.outputSlot;
        // Nested with slot: write the final value to the slot when modified.
        if (mode === 'strip' && unrecognizedIdentifier) {
            const innerKey = freshIdentifier(state, 'sanitizedKey');
            successStatements.push(
                ifStatement(notEquals(unrecognizedIdentifier, undefinedExpression), [
                    ...buildSanitized(innerKey, unrecognizedIdentifier),
                    assign(slot.target, sanitizedIdentifier),
                    assign(slot.isModified, trueLiteral),
                ]),
            );
        }
        if (hasModifications && modifiedIdentifier) {
            successStatements.push(
                ifStatement(hasModifications, [
                    assign(slot.target, finalModified(modifiedIdentifier)),
                    assign(slot.isModified, trueLiteral),
                ]),
            );
        }
    }

    const innerBody: ts.Statement[] = [...stateStatements, dispatchLoop, ...missingStatements];
    if (strictBlock) {
        innerBody.push(strictBlock);
    }
    innerBody.push(failureBlock);
    innerBody.push(...successStatements);

    const typeFailure = emitFailureRouting(leafExpression('invalid_type', { expected: stringLiteral('object') }), sink);
    if (sink.kind === 'return') {
        return [ifStatement(not(call(identifier('isPlainObject'), [valueExpression])), [typeFailure]), ...innerBody];
    }
    return [ifStatement(not(call(identifier('isPlainObject'), [valueExpression])), [typeFailure], innerBody)];
}

export { emitObjectSlowPath };
