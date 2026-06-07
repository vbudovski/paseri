import type { IR } from '@vbudovski/paseri/introspect';
import ts from 'typescript';
import {
    assign,
    block,
    call,
    equals,
    falseLiteral,
    identifier,
    ifStatement,
    letStatement,
    not,
    returnStatement,
    trueLiteral,
    typeReference,
    typeUnion,
    undefinedExpression,
    undefinedType,
    unknownType,
} from '../../builders.ts';
import { modifies } from '../../can-modify.ts';
import { emitFailureRouting, emitSuccessRouting, successPayload } from '../../issues.ts';
import { freshIdentifier, type Sink, type State } from '../../state.ts';
import { emitValidation } from '../../toSource.ts';
import { emitDiscriminatedUnion, findDiscriminator } from './discriminator.ts';

const { factory } = ts;

type UnionIR = Extract<IR, { kind: 'union' }>;

/**
 * Emits union validation. Dispatches to `emitDiscriminatedUnion` when a
 * discriminator field is found; otherwise emits the general try-each-member
 * form (set `memberSuccess` on first match, accumulate per-member issues).
 */
function emitUnion(ir: UnionIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const discriminator = findDiscriminator(ir);
    if (discriminator !== undefined) {
        return emitDiscriminatedUnion(discriminator, valueExpression, sink, state);
    }

    const memberSuccess = freshIdentifier(state, 'success');
    const issueIdentifier = freshIdentifier(state, 'issue');
    const anyMemberCanModify = ir.members.some((member) => modifies(member, state));
    const unionValueIdentifier = anyMemberCanModify ? freshIdentifier(state, 'unionValue') : undefined;
    const unionIsModified = anyMemberCanModify ? freshIdentifier(state, 'unionModified') : undefined;

    const statements: ts.Statement[] = [
        letStatement(memberSuccess, undefined, falseLiteral),
        letStatement(issueIdentifier, typeUnion([typeReference('TreeNode'), undefinedType])),
    ];
    if (unionValueIdentifier) {
        statements.push(letStatement(unionValueIdentifier, unknownType));
    }
    if (unionIsModified) {
        statements.push(letStatement(unionIsModified, undefined, falseLiteral));
    }

    for (const member of ir.members) {
        const memberIssue = freshIdentifier(state, 'memberIssue');
        const memberCanModify = modifies(member, state);
        const memberValueIdentifier = memberCanModify ? freshIdentifier(state, 'memberValue') : undefined;
        const memberIsModified = memberCanModify ? freshIdentifier(state, 'memberModified') : undefined;

        const memberBody: ts.Statement[] = [
            letStatement(memberIssue, typeUnion([typeReference('TreeNode'), undefinedType])),
        ];
        if (memberValueIdentifier) {
            memberBody.push(letStatement(memberValueIdentifier, undefined, valueExpression));
        }
        if (memberIsModified) {
            memberBody.push(letStatement(memberIsModified, undefined, falseLiteral));
        }

        const childSink: Sink =
            memberCanModify && memberValueIdentifier !== undefined && memberIsModified !== undefined
                ? {
                      kind: 'accumulate',
                      issueIdentifier: memberIssue,
                      keyExpression: undefined,
                      outputSlot: { target: memberValueIdentifier, isModified: memberIsModified },
                  }
                : { kind: 'accumulate', issueIdentifier: memberIssue, keyExpression: undefined };

        memberBody.push(...emitValidation(member, memberValueIdentifier ?? valueExpression, childSink, state));

        const successBranch: ts.Statement[] = [assign(memberSuccess, trueLiteral)];
        if (unionValueIdentifier && unionIsModified && memberCanModify && memberValueIdentifier && memberIsModified) {
            successBranch.push(
                ifStatement(memberIsModified, [
                    assign(unionValueIdentifier, memberValueIdentifier),
                    assign(unionIsModified, trueLiteral),
                ]),
            );
        }

        memberBody.push(
            ifStatement(equals(memberIssue, undefinedExpression), successBranch, [
                assign(issueIdentifier, call(identifier('addIssue'), [issueIdentifier, memberIssue])),
            ]),
        );

        statements.push(ifStatement(not(memberSuccess), [block(memberBody)]));
    }

    const trailingSuccess = emitSuccessRouting(sink);
    const successBranchStatements: ts.Statement[] = [];
    if (sink.kind === 'return') {
        if (unionValueIdentifier && unionIsModified) {
            successBranchStatements.push(
                ifStatement(unionIsModified, [returnStatement(successPayload(unionValueIdentifier, sink.outputType))]),
            );
        }
        if (trailingSuccess !== undefined) {
            successBranchStatements.push(trailingSuccess);
        }
    } else if (sink.outputSlot !== undefined && unionValueIdentifier && unionIsModified) {
        const slot = sink.outputSlot;
        successBranchStatements.push(
            ifStatement(unionIsModified, [
                assign(slot.target, unionValueIdentifier),
                assign(slot.isModified, trueLiteral),
            ]),
        );
    }

    statements.push(
        ifStatement(memberSuccess, successBranchStatements, [
            emitFailureRouting(factory.createNonNullExpression(issueIdentifier), sink),
        ]),
    );

    return [block(statements)];
}

export { emitUnion };
