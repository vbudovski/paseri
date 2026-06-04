import ts from 'typescript';
import {
    assign,
    binary,
    call,
    constStatement,
    elementAccess,
    expressionStatement,
    falseLiteral,
    forIn,
    identifier,
    ifStatement,
    letStatement,
    not,
    notEquals,
    numericLiteral,
    objectLiteral,
    postfixIncrement,
    recordAccess,
    recordType,
    returnStatement,
    stringLiteral,
    trueLiteral,
    typeReference,
    typeUnion,
    undefinedExpression,
    undefinedType,
    unknownType,
} from '../../builders.ts';
import {
    emitFailureRouting,
    emitSuccessRouting,
    leafExpression,
    nestExpression,
    successPayload,
} from '../../issues.ts';
import { freshIdentifier, type Sink, type State } from '../../state.ts';
import { emitValidation } from '../../toSource.ts';
import { isFieldOptional, type ObjectIR } from './common.ts';

/**
 * Fast path: per-field direct property access + `in` check, replacing the
 * `for..in` + switch dispatch. Inline-cacheable on stable input shapes;
 * the happy path skips presence checks entirely.
 */
function emitObjectFastPath(ir: ObjectIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const fields = Object.entries(ir.fields);
    const mode = ir.mode;
    const trackUnrecognized = mode === 'strict' || mode === 'strip';

    const issueIdentifier = freshIdentifier(state, 'issue');
    const bodyStatements: ts.Statement[] = [
        letStatement(issueIdentifier, typeUnion([typeReference('TreeNode'), undefinedType])),
    ];
    const hasExtrasIdentifier = mode === 'strip' ? freshIdentifier(state, 'hasExtras') : undefined;
    if (hasExtrasIdentifier !== undefined) {
        bodyStatements.push(letStatement(hasExtrasIdentifier, undefined, falseLiteral));
    }

    // Phase 1: validate present fields in schema order. For required fields
    // we accumulate issues into `_issue` directly so the tree order matches
    // the runtime (present-field issues come before missing-field issues).
    // The field-value identifiers are declared at outer scope so the strip-
    // mode sanitiser can read them after the if-block. The presence flag for
    // required fields is also cached so phase 2 can reuse it without a
    // second `in` check.
    const fieldValueIdentifiers = new Map<string, ts.Identifier>();
    const presenceIdentifiers = new Map<string, ts.Identifier>();
    for (const [fieldName, fieldIR] of fields) {
        const optional = isFieldOptional(fieldIR);
        const fieldValueIdentifier = freshIdentifier(state, 'value');
        fieldValueIdentifiers.set(fieldName, fieldValueIdentifier);
        bodyStatements.push(letStatement(fieldValueIdentifier, unknownType));

        const fieldSink: Sink = {
            kind: 'accumulate',
            issueIdentifier,
            keyExpression: stringLiteral(fieldName),
        };

        if (optional) {
            // Optional fields: just access and validate. The optional IR emit
            // handles `undefined` (missing or explicit) by skipping the inner
            // validation, which matches the runtime.
            bodyStatements.push(
                assign(fieldValueIdentifier, recordAccess(valueExpression, stringLiteral(fieldName))),
                ...emitValidation(fieldIR, fieldValueIdentifier, fieldSink, state),
            );
        } else {
            // Required: gate on `KEY in value` so missing keys take the
            // missing_value branch in phase 2 instead of the typecheck path
            // (which would emit invalid_type instead). Cache the result so
            // phase 2 doesn't recompute it.
            const presenceIdentifier = freshIdentifier(state, 'has');
            presenceIdentifiers.set(fieldName, presenceIdentifier);
            bodyStatements.push(
                constStatement(
                    presenceIdentifier,
                    undefined,
                    binary(stringLiteral(fieldName), ts.SyntaxKind.InKeyword, valueExpression),
                ),
            );
            const presentBranch: ts.Statement[] = [
                assign(fieldValueIdentifier, recordAccess(valueExpression, stringLiteral(fieldName))),
                ...emitValidation(fieldIR, fieldValueIdentifier, fieldSink, state),
            ];
            bodyStatements.push(ifStatement(presenceIdentifier, presentBranch));
        }
    }

    // Phase 2: emit missing_value for absent required fields, in schema order.
    for (const [fieldName, fieldIR] of fields) {
        if (isFieldOptional(fieldIR)) {
            continue;
        }
        const presenceIdentifier = presenceIdentifiers.get(fieldName);
        if (presenceIdentifier === undefined) {
            continue;
        }
        bodyStatements.push(
            ifStatement(not(presenceIdentifier), [
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

    // Phase 3: unrecognised key detection (strict/strip).
    //
    // Fast common path: when the input has exactly `fields.length` keys AND
    // every required field is present, the input can't contain an unknown
    // key (no extras, no missing — and JS objects don't duplicate keys). A
    // cheap count + flag check skips the full scan. Only applied when the
    // schema has no optional fields, since we'd otherwise need an extra
    // `in` check per optional to make the count comparison meaningful.
    if (trackUnrecognized) {
        const allFieldsRequired = fields.every(([, fieldIR]) => !isFieldOptional(fieldIR));
        const keyIdentifier = freshIdentifier(state, 'key');
        let isKnown: ts.Expression = binary(
            keyIdentifier,
            ts.SyntaxKind.EqualsEqualsEqualsToken,
            stringLiteral(fields[0][0]),
        );
        for (let index = 1; index < fields.length; index++) {
            isKnown = binary(
                isKnown,
                ts.SyntaxKind.BarBarToken,
                binary(keyIdentifier, ts.SyntaxKind.EqualsEqualsEqualsToken, stringLiteral(fields[index][0])),
            );
        }
        const unrecognizedBranch: ts.Statement[] = [];
        if (hasExtrasIdentifier !== undefined) {
            unrecognizedBranch.push(assign(hasExtrasIdentifier, trueLiteral));
        }
        if (mode === 'strict') {
            unrecognizedBranch.push(
                assign(
                    issueIdentifier,
                    call(identifier('addIssue'), [
                        issueIdentifier,
                        nestExpression(keyIdentifier, leafExpression('unrecognized_key')),
                    ]),
                ),
            );
        }
        const scanLoop = forIn(keyIdentifier, valueExpression, [ifStatement(not(isKnown), unrecognizedBranch)]);

        if (allFieldsRequired) {
            const countIdentifier = freshIdentifier(state, 'count');
            const countKeyIdentifier = freshIdentifier(state, 'k');
            bodyStatements.push(
                letStatement(countIdentifier, undefined, numericLiteral(0)),
                forIn(countKeyIdentifier, valueExpression, [expressionStatement(postfixIncrement(countIdentifier))]),
            );
            let needsScan: ts.Expression = binary(
                countIdentifier,
                ts.SyntaxKind.ExclamationEqualsEqualsToken,
                numericLiteral(fields.length),
            );
            for (const [name] of fields) {
                const presenceIdentifier = presenceIdentifiers.get(name);
                if (presenceIdentifier === undefined) {
                    continue;
                }
                needsScan = binary(needsScan, ts.SyntaxKind.BarBarToken, not(presenceIdentifier));
            }
            bodyStatements.push(ifStatement(needsScan, [scanLoop]));
        } else {
            bodyStatements.push(scanLoop);
        }
    }

    bodyStatements.push(
        ifStatement(notEquals(issueIdentifier, undefinedExpression), [emitFailureRouting(issueIdentifier, sink)]),
    );

    if (mode === 'strip' && hasExtrasIdentifier !== undefined) {
        const sanitizedIdentifier = freshIdentifier(state, 'sanitized');
        const buildSanitized: ts.Statement[] = [constStatement(sanitizedIdentifier, recordType, objectLiteral({}))];
        for (const [name] of fields) {
            const valueIdentifier = fieldValueIdentifiers.get(name);
            if (valueIdentifier === undefined) {
                continue;
            }
            // Re-use the cached presence flag if we have one; otherwise the
            // field is optional and we test directly.
            const cachedPresence = presenceIdentifiers.get(name);
            const presenceExpression =
                cachedPresence ?? binary(stringLiteral(name), ts.SyntaxKind.InKeyword, valueExpression);
            buildSanitized.push(
                ifStatement(presenceExpression, [
                    assign(elementAccess(sanitizedIdentifier, stringLiteral(name)), valueIdentifier),
                ]),
            );
        }
        if (sink.kind === 'return') {
            bodyStatements.push(
                ifStatement(hasExtrasIdentifier, [
                    ...buildSanitized,
                    returnStatement(successPayload(sanitizedIdentifier, sink.outputType)),
                ]),
            );
            const trailingSuccess = emitSuccessRouting(sink);
            if (trailingSuccess !== undefined) {
                bodyStatements.push(trailingSuccess);
            }
        } else if (sink.outputSlot !== undefined) {
            const slot = sink.outputSlot;
            bodyStatements.push(
                ifStatement(hasExtrasIdentifier, [
                    ...buildSanitized,
                    assign(slot.target, sanitizedIdentifier),
                    assign(slot.isModified, trueLiteral),
                ]),
            );
        }
    } else if (sink.kind === 'return') {
        const trailingSuccess = emitSuccessRouting(sink);
        if (trailingSuccess !== undefined) {
            bodyStatements.push(trailingSuccess);
        }
    }

    const typeFailure = emitFailureRouting(leafExpression('invalid_type', { expected: stringLiteral('object') }), sink);
    // `isPlainObject` is always spliced for object schemas (analyzeNeeds), so call it rather than re-inlining a copy
    // that can drift from paseri-lib's predicate (the `constructor` / `Array.isArray` cases are easy to miss inline).
    const isNotPlainObject = not(call(identifier('isPlainObject'), [valueExpression]));
    if (sink.kind === 'return') {
        return [ifStatement(isNotPlainObject, [typeFailure]), ...bodyStatements];
    }
    return [ifStatement(isNotPlainObject, [typeFailure], bodyStatements)];
}

export { emitObjectFastPath };
