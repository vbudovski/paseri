import type { IR } from '@vbudovski/paseri/introspect';
import type ts from 'typescript';
import { assign, equals, ifStatement, returnStatement, trueLiteral, undefinedExpression } from '../builders.ts';
import { successPayload } from '../issues.ts';
import { registerDefault, type Sink, type State } from '../state.ts';
import { emitValidation } from '../toSource.ts';

type DefaultIR = Extract<IR, { kind: 'default' }>;

function emitDefault(ir: DefaultIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const defaultIdentifier = registerDefault(state, ir.value);
    if (sink.kind === 'return') {
        return [
            ifStatement(equals(valueExpression, undefinedExpression), [
                returnStatement(successPayload(defaultIdentifier, sink.outputType)),
            ]),
            ...emitValidation(ir.inner, valueExpression, sink, state),
        ];
    }
    // outputSlot must be present here: canModify('default') is true so every container allocates one.
    if (sink.outputSlot === undefined) {
        throw new Error('emitDefault internal: accumulate sink missing outputSlot');
    }
    const slot = sink.outputSlot;
    return [
        ifStatement(
            equals(valueExpression, undefinedExpression),
            [assign(slot.target, defaultIdentifier), assign(slot.isModified, trueLiteral)],
            emitValidation(ir.inner, valueExpression, sink, state),
        ),
    ];
}

export { emitDefault };
