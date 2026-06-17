import type { IR } from '@paseri/paseri/introspect';
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
import { emitEnum } from '../enum.ts';
import { containsReachableDefault, tryShapeSelfContained, withShapeAttempt } from '../object/shape.ts';
import { emitDiscriminatedUnion, findDiscriminator } from './discriminator.ts';

const { factory } = ts;

type UnionIR = Extract<IR, { kind: 'union' }>;
type LiteralIR = Extract<IR, { kind: 'literal' }>;

const { BarBarToken } = ts.SyntaxKind;

/**
 * All-literal unions compile to an enum-style `Set.has` test, converging with the runtime: a single
 * `invalid_enum_value` leaf on miss, not a per-member `invalid_value` tree. A match falls through to the
 * trailing success (literals never modify). Undefined unless every member is a bare literal.
 */
function tryEmitLiteralSet(
    ir: UnionIR,
    valueExpression: ts.Expression,
    sink: Sink,
    state: State,
): ts.Statement[] | undefined {
    if (!ir.members.every((member) => member.kind === 'literal')) {
        return undefined;
    }

    const values = (ir.members as LiteralIR[]).map((member) => member.value);
    // An all-literal union is an enum by another name; delegate so the membership codegen has one source of
    // truth (and shares the hoisted Set with any equivalent `enum`).
    return emitEnum({ kind: 'enum', values }, valueExpression, sink, state);
}

/**
 * Boolean OR over the leading run of exactly-shapeable members, bypassing the try-each form's per-member issue
 * allocation: an exact member's shape is false iff it doesn't match, so a match means first-match resolves to the
 * unmodified input. The run stops at the first unshapeable member and at the first with a reachable `.default()`
 * (its shape under-matches, so a later member must not accept the input in its place). Undefined if none are shapeable.
 */
function tryBuildShapePreCheck(ir: UnionIR, valueExpression: ts.Expression, state: State): ts.Expression | undefined {
    const memberShapes: ts.Expression[] = [];
    for (const member of ir.members) {
        if (containsReachableDefault(member, state, new Set())) {
            break;
        }
        const memberShape = withShapeAttempt(state, () => tryShapeSelfContained(member, valueExpression, state));
        if (memberShape === undefined) {
            break;
        }
        memberShapes.push(memberShape);
    }
    if (memberShapes.length === 0) {
        return undefined;
    }
    return memberShapes.reduce((left, right) => factory.createBinaryExpression(left, BarBarToken, right));
}

/**
 * Emits union validation. Dispatches to `emitDiscriminatedUnion` when a
 * discriminator field is found; otherwise emits the general try-each-member
 * form (set `memberSuccess` on first match, accumulate per-member issues),
 * preceded by a boolean shape pre-check that bypasses it on clean matches.
 */
function emitUnion(ir: UnionIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const discriminator = findDiscriminator(ir);
    if (discriminator !== undefined) {
        return emitDiscriminatedUnion(discriminator, valueExpression, sink, state);
    }

    const literalSet = tryEmitLiteralSet(ir, valueExpression, sink, state);
    if (literalSet !== undefined) {
        return literalSet;
    }

    const preCheck = tryBuildShapePreCheck(ir, valueExpression, state);
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

    if (preCheck === undefined) {
        return [block(statements)];
    }
    if (sink.kind === 'return') {
        const preCheckSuccess = emitSuccessRouting(sink);
        if (preCheckSuccess !== undefined) {
            return [ifStatement(preCheck, [preCheckSuccess]), block(statements)];
        }
        return [block(statements)];
    }
    // Accumulate sink: a pre-check match means no issue and no modification, so the whole try-each is skipped.
    return [ifStatement(not(preCheck), [block(statements)])];
}

export { emitUnion };
