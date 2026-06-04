import ts from 'typescript';
import { binary, ifStatement, notEquals, property, undefinedExpression } from '../builders.ts';
import { emitFailureRouting, leafExpression } from '../issues.ts';
import type { Sink } from '../state.ts';

/**
 * Emits nested guards `if (newContainer !== undefined) { if (newContainer.size !== index) { <duplicate_key failure> } }`.
 * Used by container emitters (set, map) that build a fresh container during
 * iteration to detect duplicate keys after substitution.
 */
function emitDuplicateKeyCheck(
    newContainerIdentifier: ts.Identifier,
    indexIdentifier: ts.Identifier,
    sink: Sink,
): ts.Statement[] {
    return [
        ifStatement(notEquals(newContainerIdentifier, undefinedExpression), [
            ifStatement(
                binary(
                    property(newContainerIdentifier, 'size'),
                    ts.SyntaxKind.ExclamationEqualsEqualsToken,
                    indexIdentifier,
                ),
                [emitFailureRouting(leafExpression('duplicate_key'), sink)],
            ),
        ]),
    ];
}

export { emitDuplicateKeyCheck };
