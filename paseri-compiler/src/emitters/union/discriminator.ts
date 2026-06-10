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
 * Finds a discriminator key for the union: a field present on every member
 * (which must be an object) with a literal value. Returns undefined if no
 * such key exists, including when any member isn't an object.
 */
function findDiscriminator(union: UnionIR): Discriminator | undefined {
    if (!union.members.every((member) => member.kind === 'object')) {
        return undefined;
    }
    const objectMembers = union.members as readonly ObjectIR[];
    // Null prototype: keys come from user shapes, so __proto__/constructor must behave as plain keys.
    const counts: Record<string, number> = Object.create(null);
    for (const member of objectMembers) {
        for (const [key, field] of Object.entries(member.fields)) {
            if (field.kind === 'literal') {
                counts[key] = (counts[key] ?? 0) + 1;
            }
        }
    }
    const candidateKeys = Object.entries(counts)
        .filter(([, count]) => count === objectMembers.length)
        .map(([entryKey]) => entryKey);
    // Same selection rule as the runtime's findDiscriminator: the first candidate key whose values are
    // all distinct wins, so runtime and compiled dispatch agree on the discriminator (the choice is
    // observable through which member's issues a partial match reports).
    for (const key of candidateKeys) {
        const cases: { value: LiteralIR['value']; member: ObjectIR }[] = [];
        const expected: string[] = [];
        const seenValues = new Set<LiteralIR['value']>();
        let usable = true;
        for (const member of objectMembers) {
            const field = member.fields[key];
            if (field.kind !== 'literal' || seenValues.has(field.value)) {
                usable = false;
                break;
            }
            seenValues.add(field.value);
            cases.push({ value: field.value, member });
            expected.push(primitiveToString(field.value));
        }
        if (usable) {
            return { key, cases, expected };
        }
    }
    return undefined;
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
