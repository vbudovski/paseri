import type { IR } from '@vbudovski/paseri/introspect';
import type ts from 'typescript';
import {
    assign,
    call,
    castTo,
    falseLiteral,
    functionType,
    ifStatement,
    letStatement,
    not,
    notEquals,
    property,
    returnStatement,
    trueLiteral,
    typeReference,
    typeUnion,
    undefinedExpression,
    undefinedType,
    unknownType,
} from '../builders.ts';
import { modifies } from '../can-modify.ts';
import { emitType } from '../emit-type.ts';
import { emitFailureRouting, successPayload } from '../issues.ts';
import { freshIdentifier, type Sink, type State } from '../state.ts';
import { emitValidation } from '../toSource.ts';
import { getOrCreateCallback } from './refine/index.ts';

type ChainIR = Extract<IR, { kind: 'chain' }>;

/**
 * Emits a chain: validate `from`, run the transformer on its (possibly transformed) output, then validate `to`,
 * threading transformed values forward and accumulating any failure in a local issue so a container `from`/`to`
 * can't short-circuit the pipeline with its own `return`.
 */
function emitChain(ir: ChainIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    // The transformer receives `from`'s output and returns a `ParseResult<to-output>`. Type the hoisted transformer
    // const with that (so its parameter isn't an implicit `any`), and cast the validated `from` value to it at the call.
    const fromType = emitType(ir.from);
    const transformerIdentifier = getOrCreateCallback(
        ir.callback,
        state,
        'chain',
        functionType(fromType, typeReference('ParseResult', [emitType(ir.to)])),
    );
    const innerIssueIdentifier = freshIdentifier(state, 'chainIssue');
    const resultIdentifier = freshIdentifier(state, 'chainResult');

    const fromCanModify = modifies(ir.from, state);
    const toCanModify = modifies(ir.to, state);

    // Live values flowing through the pipeline. Both are `let` because the
    // inner schemas may rewrite them via an outputSlot (defaults filling
    // undefined, objects stripping unrecognised keys, etc.).
    const fromValueIdentifier = freshIdentifier(state, 'chainFromValue');
    const fromModifiedIdentifier = fromCanModify ? freshIdentifier(state, 'chainFromModified') : undefined;
    const toValueIdentifier = freshIdentifier(state, 'chainToValue');
    const toModifiedIdentifier = toCanModify ? freshIdentifier(state, 'chainToModified') : undefined;

    // Internal accumulate-sink: validating `from` / `to` with the outer sink
    // directly would let container schemas emit `return successPayload(...)`
    // and short-circuit the chain. We catch failures here instead. A `*Modified`
    // identifier is defined iff its side can modify, so its presence alone gates
    // the output slot.
    const makeInnerSink = (valueIdentifier: ts.Identifier, modifiedIdentifier: ts.Identifier | undefined): Sink =>
        modifiedIdentifier !== undefined
            ? {
                  kind: 'accumulate',
                  issueIdentifier: innerIssueIdentifier,
                  keyExpression: undefined,
                  outputSlot: { target: valueIdentifier, isModified: modifiedIdentifier },
              }
            : { kind: 'accumulate', issueIdentifier: innerIssueIdentifier, keyExpression: undefined };
    const fromSink = makeInnerSink(fromValueIdentifier, fromModifiedIdentifier);
    const toSink = makeInnerSink(toValueIdentifier, toModifiedIdentifier);

    const successRouting: ts.Statement[] = (() => {
        if (sink.kind === 'return') {
            return [returnStatement(successPayload(toValueIdentifier, sink.outputType))];
        }
        if (sink.outputSlot !== undefined) {
            return [assign(sink.outputSlot.target, toValueIdentifier), assign(sink.outputSlot.isModified, trueLiteral)];
        }
        return [];
    })();

    const toBlock: ts.Statement[] = [
        letStatement(toValueIdentifier, undefined, property(resultIdentifier, 'value')),
        ...(toModifiedIdentifier !== undefined ? [letStatement(toModifiedIdentifier, undefined, falseLiteral)] : []),
        ...emitValidation(ir.to, toValueIdentifier, toSink, state),
        ifStatement(
            notEquals(innerIssueIdentifier, undefinedExpression),
            [emitFailureRouting(innerIssueIdentifier, sink)],
            successRouting,
        ),
    ];

    const transformerBlock: ts.Statement[] = [
        letStatement(resultIdentifier, undefined, call(transformerIdentifier, [castTo(fromValueIdentifier, fromType)])),
        ifStatement(
            not(property(resultIdentifier, 'ok')),
            [emitFailureRouting(property(resultIdentifier, 'issue'), sink)],
            toBlock,
        ),
    ];

    return [
        letStatement(innerIssueIdentifier, typeUnion([typeReference('TreeNode'), undefinedType])),
        letStatement(fromValueIdentifier, unknownType, valueExpression),
        ...(fromModifiedIdentifier !== undefined
            ? [letStatement(fromModifiedIdentifier, undefined, falseLiteral)]
            : []),
        ...emitValidation(ir.from, fromValueIdentifier, fromSink, state),
        ifStatement(
            notEquals(innerIssueIdentifier, undefinedExpression),
            [emitFailureRouting(innerIssueIdentifier, sink)],
            transformerBlock,
        ),
    ];
}

export { emitChain };
