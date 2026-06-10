import type { IR } from '@paseri/paseri/introspect';
import ts from 'typescript';
import {
    call,
    elementAccess,
    equals,
    identifier,
    ifStatement,
    literalExpression,
    primitiveToString,
    property,
    stringLiteral,
} from '../../builders.ts';
import { emitFailureRouting, emitTypeCheckedBlock, leafExpression } from '../../issues.ts';
import type { Sink, State } from '../../state.ts';
import { emitValidation } from '../../toSource.ts';

type UnionIR = Extract<IR, { kind: 'union' }>;
type ObjectIR = Extract<IR, { kind: 'object' }>;
type LiteralIR = Extract<IR, { kind: 'literal' }>;

interface Discriminator {
    readonly key: string;
    readonly cases: readonly { readonly value: LiteralIR['value']; readonly member: ObjectIR }[];
    readonly expected: readonly string[];
}

/**
 * Builds the dispatch table from the discriminator key the runtime recorded (`union.discriminator`) — compiled
 * dispatch mirrors the runtime's choice instead of re-deriving it (observable via which member a partial match
 * blames). Undefined when no key was recorded (→ try-each). Members are known to carry distinct literals there.
 */
function findDiscriminator(union: UnionIR): Discriminator | undefined {
    const key = union.discriminator;
    if (key === undefined) {
        return undefined;
    }
    const cases: { value: LiteralIR['value']; member: ObjectIR }[] = [];
    const expected: string[] = [];
    for (const member of union.members as readonly ObjectIR[]) {
        const field = member.fields[key] as LiteralIR;
        cases.push({ value: field.value, member });
        expected.push(primitiveToString(field.value));
    }
    return { key, cases, expected };
}

function discriminatorMatch(discriminatorValue: ts.Expression, literal: LiteralIR['value']): ts.Expression {
    if (typeof literal === 'number' && Number.isNaN(literal)) {
        return call(property(identifier('Number'), 'isNaN'), [discriminatorValue]);
    }
    return equals(discriminatorValue, literalExpression(literal));
}

/**
 * Emits a discriminated union: type-check (isPlainObject), read the
 * discriminator field, then a chained if/else-if matching each member's
 * literal value to its validator. Unrecognised values produce
 * `invalid_discriminator_value`.
 */
function emitDiscriminatedUnion(
    discriminator: Discriminator,
    valueExpression: ts.Expression,
    sink: Sink,
    state: State,
): ts.Statement[] {
    const typeFailure = leafExpression('invalid_type', { expected: stringLiteral('object') });
    const discriminatorValue = elementAccess(valueExpression, stringLiteral(discriminator.key));
    const expectedArray = ts.factory.createArrayLiteralExpression(
        discriminator.expected.map((entry) => stringLiteral(entry)),
        false,
    );
    const discriminatorFailure = leafExpression('invalid_discriminator_value', { expected: expectedArray });

    let elseBranch: ts.Statement[] | undefined = [emitFailureRouting(discriminatorFailure, sink)];
    for (let i = discriminator.cases.length - 1; i >= 0; i--) {
        const { value, member } = discriminator.cases[i];
        const memberStatements = emitValidation(member, valueExpression, sink, state);
        const condition = discriminatorMatch(discriminatorValue, value);
        elseBranch = [ifStatement(condition, memberStatements, elseBranch)];
    }

    return [emitTypeCheckedBlock(call(identifier('isPlainObject'), [valueExpression]), typeFailure, elseBranch, sink)];
}

export { emitDiscriminatedUnion, findDiscriminator };
