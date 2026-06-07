// Emits the TypeScript output type for an IR node — the dual of the validation emitter. Used to type the generated
// `safeParse*` return as `ParseResult<OutputType>` instead of `ParseResult<unknown>`, mirroring `Infer`. Pure
// type-level output: every node it produces is erased at runtime, so it never affects emitted JS.

import type { IR, IRGraph } from '@vbudovski/paseri/introspect';
import ts from 'typescript';

const { factory } = ts;

function keyword(kind: ts.KeywordTypeSyntaxKind): ts.KeywordTypeNode {
    return factory.createKeywordTypeNode(kind);
}

const undefinedTypeNode = keyword(ts.SyntaxKind.UndefinedKeyword);

// Recursive (`lazy`/`ref`) graph entries become recursive `type` aliases; a `ref` references its alias by this name.
function refTypeName(name: string): string {
    return `${name}Type`;
}

function temporalType(member: string): ts.TypeNode {
    return factory.createTypeReferenceNode(factory.createQualifiedName(factory.createIdentifier('Temporal'), member));
}

function literalType(value: string | number | bigint | boolean): ts.TypeNode {
    if (typeof value === 'string') {
        return factory.createLiteralTypeNode(factory.createStringLiteral(value));
    }
    if (typeof value === 'boolean') {
        return factory.createLiteralTypeNode(value ? factory.createTrue() : factory.createFalse());
    }
    if (typeof value === 'bigint') {
        return factory.createLiteralTypeNode(factory.createBigIntLiteral(`${value.toString()}n`));
    }
    if (Number.isNaN(value)) {
        // There is no NaN literal type; widen to `number`. The value-side guard still matches NaN exactly, so the
        // generated runtime check is unaffected — only the static output type is broadened.
        return keyword(ts.SyntaxKind.NumberKeyword);
    }
    if (value < 0) {
        // `createNumericLiteral` rejects negatives; a negative literal type is a `-` prefix over the magnitude.
        return factory.createLiteralTypeNode(
            factory.createPrefixUnaryExpression(ts.SyntaxKind.MinusToken, factory.createNumericLiteral(-value)),
        );
    }
    return factory.createLiteralTypeNode(factory.createNumericLiteral(value));
}

// Mirrors `InferObject`: a field whose output includes `undefined` becomes optional (`?:`) with `undefined` removed.
function stripUndefined(type: ts.TypeNode): { optional: boolean; type: ts.TypeNode } {
    if (!ts.isUnionTypeNode(type)) {
        return { optional: false, type };
    }
    const members = type.types.filter((member) => member.kind !== ts.SyntaxKind.UndefinedKeyword);
    if (members.length === type.types.length) {
        return { optional: false, type };
    }
    return { optional: true, type: members.length === 1 ? members[0] : factory.createUnionTypeNode(members) };
}

function objectType(ir: Extract<IR, { kind: 'object' }>): ts.TypeNode {
    const members = Object.entries(ir.fields).map(([name, fieldIR]) => {
        const { optional, type } = stripUndefined(emitType(fieldIR));
        return factory.createPropertySignature(
            undefined,
            factory.createStringLiteral(name),
            optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
            type,
        );
    });
    return factory.createTypeLiteralNode(members);
}

function emitType(ir: IR): ts.TypeNode {
    switch (ir.kind) {
        case 'string':
            return keyword(ts.SyntaxKind.StringKeyword);
        case 'number':
            return keyword(ts.SyntaxKind.NumberKeyword);
        case 'bigint':
            return keyword(ts.SyntaxKind.BigIntKeyword);
        case 'boolean':
            return keyword(ts.SyntaxKind.BooleanKeyword);
        case 'symbol':
            return keyword(ts.SyntaxKind.SymbolKeyword);
        case 'null':
            return factory.createLiteralTypeNode(factory.createNull());
        case 'undefined':
            return undefinedTypeNode;
        case 'never':
            return keyword(ts.SyntaxKind.NeverKeyword);
        case 'unknown':
            return keyword(ts.SyntaxKind.UnknownKeyword);
        case 'literal':
            return literalType(ir.value);
        case 'enum':
            return factory.createUnionTypeNode(ir.values.map(literalType));
        case 'array':
            return factory.createArrayTypeNode(emitType(ir.element));
        case 'tuple':
            return factory.createTupleTypeNode(ir.elements.map(emitType));
        case 'set':
            return factory.createTypeReferenceNode('Set', [emitType(ir.element)]);
        case 'map':
            return factory.createTypeReferenceNode('Map', [emitType(ir.key), emitType(ir.value)]);
        case 'record':
            return factory.createTypeReferenceNode('Record', [
                keyword(ts.SyntaxKind.StringKeyword),
                emitType(ir.element),
            ]);
        case 'object':
            return objectType(ir);
        case 'union':
            return factory.createUnionTypeNode(ir.members.map(emitType));
        case 'optional':
            return factory.createUnionTypeNode([emitType(ir.inner), undefinedTypeNode]);
        case 'nullable':
            return factory.createUnionTypeNode([
                emitType(ir.inner),
                factory.createLiteralTypeNode(factory.createNull()),
            ]);
        case 'default':
            // A default always produces a value, so the output excludes `undefined`.
            return factory.createTypeReferenceNode('Exclude', [emitType(ir.inner), undefinedTypeNode]);
        case 'date':
            return factory.createTypeReferenceNode('Date');
        case 'duration':
            return temporalType('Duration');
        case 'instant':
            return temporalType('Instant');
        case 'plainDate':
            return temporalType('PlainDate');
        case 'plainDateTime':
            return temporalType('PlainDateTime');
        case 'plainMonthDay':
            return temporalType('PlainMonthDay');
        case 'plainTime':
            return temporalType('PlainTime');
        case 'plainYearMonth':
            return temporalType('PlainYearMonth');
        case 'zonedDateTime':
            return temporalType('ZonedDateTime');
        case 'ref':
            return factory.createTypeReferenceNode(refTypeName(ir.name));
        case 'refine':
            return emitType(ir.inner);
        case 'chain':
            return emitType(ir.to);
        case 'unsupported':
            // Unreachable — `emitValidation` throws on `unsupported` before any type is emitted.
            return keyword(ts.SyntaxKind.UnknownKeyword);
    }
}

// One recursive `type <name>Type = <output>` alias per named (lazy/recursive) graph entry, paralleling the named
// validator functions. `ref` nodes reference these by name.
function emitNamedTypeAliases(graph: IRGraph): ts.Statement[] {
    return Object.entries(graph.named).map(([name, ir]) =>
        factory.createTypeAliasDeclaration(undefined, refTypeName(name), undefined, emitType(ir)),
    );
}

export { emitNamedTypeAliases, emitType };
