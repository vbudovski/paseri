// Static guard: a `.schema.ts` export becomes a compiled stand-in after AOT compilation — a single object
// with `safeParse` / `parse` methods and a Standard Schema `~standard` (the same surface the runtime schema
// exposes for those members). In dev/editor it's the full schema, so using it as anything else (e.g.
// `User.optional()`) works in dev but breaks at build. This flags such use-sites in app code at build time
// with a clear error. It is a single-module heuristic — direct member access and destructuring on schema
// bindings — not full dataflow, so it catches the common mistakes, not values routed through other variables.
import { parseAst } from 'vite';
import { SCHEMA_SUFFIX } from './constants.ts';

const ALLOWED_MEMBERS: ReadonlySet<string> = new Set(['safeParse', 'parse', '~standard']);
const DERIVATION_ADVICE =
    `After AOT compilation that export only has .safeParse / .parse / ['~standard'] — move schema derivation ` +
    `(.optional(), .array(), etc.) into a ${SCHEMA_SUFFIX} file.`;

interface AstNode {
    readonly type: string;
    readonly [key: string]: unknown;
}

interface SchemaBindings {
    readonly named: ReadonlySet<string>;
    readonly namespace: ReadonlySet<string>;
}

function isNode(value: unknown): value is AstNode {
    return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

function walk(value: unknown, visit: (node: AstNode) => void): void {
    if (Array.isArray(value)) {
        for (const item of value) {
            walk(item, visit);
        }
        return;
    }
    if (!isNode(value)) {
        return;
    }
    visit(value);
    for (const key of Object.keys(value)) {
        walk(value[key], visit);
    }
}

function identifierName(value: unknown): string | undefined {
    if (isNode(value) && value.type === 'Identifier' && typeof value.name === 'string') {
        return value.name;
    }
    return undefined;
}

function literalStringValue(value: unknown): string | undefined {
    if (isNode(value) && value.type === 'Literal' && typeof value.value === 'string') {
        return value.value;
    }
    return undefined;
}

// The statically-known accessed key for `.foo`, `["foo"]`, or a `{ "foo": x }` pattern key; undefined for a
// dynamic computed key (`[expr]`) whose value can't be known here. A non-computed key may be an identifier
// (`{ safeParse }`) or a string literal (`{ "~standard": s }`), so try both.
function staticKey(computed: unknown, keyNode: unknown): string | undefined {
    if (computed === true) {
        return literalStringValue(keyNode);
    }
    return identifierName(keyNode) ?? literalStringValue(keyNode);
}

// Collect local names bound to a `.schema.ts` import, split by import kind. `named` holds
// `import { X }` / `import { X as Y }` / `import X` locals (each IS a schema); `namespace`
// holds `import * as s` locals (whose MEMBERS, `s.X`, are the schemas).
function collectSchemaBindings(ast: unknown): SchemaBindings {
    const named = new Set<string>();
    const namespace = new Set<string>();
    walk(ast, (node) => {
        if (node.type !== 'ImportDeclaration') {
            return;
        }
        const source = node.source;
        if (!isNode(source) || typeof source.value !== 'string' || !source.value.endsWith(SCHEMA_SUFFIX)) {
            return;
        }
        if (!Array.isArray(node.specifiers)) {
            return;
        }
        for (const specifier of node.specifiers) {
            if (!isNode(specifier)) {
                continue;
            }
            const local = identifierName(specifier.local);
            if (local === undefined) {
                continue;
            }
            if (specifier.type === 'ImportNamespaceSpecifier') {
                namespace.add(local);
            } else if (specifier.type === 'ImportSpecifier' || specifier.type === 'ImportDefaultSpecifier') {
                named.add(local);
            }
        }
    });
    return { named, namespace };
}

// If `node` references a schema, return a display string for it: `"User"` for a named
// binding, or `"s.User"` for a member of a namespace binding. Otherwise undefined.
function schemaReference(node: unknown, bindings: SchemaBindings): string | undefined {
    const direct = identifierName(node);
    if (direct !== undefined && bindings.named.has(direct)) {
        return direct;
    }
    if (isNode(node) && node.type === 'MemberExpression') {
        const namespaceName = identifierName(node.object);
        if (namespaceName !== undefined && bindings.namespace.has(namespaceName)) {
            const exportName = staticKey(node.computed, node.property);
            if (exportName !== undefined) {
                return `${namespaceName}.${exportName}`;
            }
        }
    }
    return undefined;
}

function forbiddenMemberError(id: string, usage: string): Error {
    return new Error(`paseri: ${id} uses "${usage}" on a ${SCHEMA_SUFFIX} import. ${DERIVATION_ADVICE}`);
}

function forbiddenDestructureError(id: string, reference: string, key: string): Error {
    return new Error(
        `paseri: ${id} destructures "${key}" from "${reference}" (a ${SCHEMA_SUFFIX} import). ${DERIVATION_ADVICE}`,
    );
}

function dynamicAccessError(id: string, usage: string): Error {
    return new Error(
        `paseri: ${id} uses "${usage}" on a ${SCHEMA_SUFFIX} import, which can't be statically verified ` +
            `against the surface (.safeParse / .parse / ['~standard']) left after AOT compilation. Access the ` +
            `schema only via .safeParse / .parse / ['~standard'], or move derivation into a ${SCHEMA_SUFFIX} file.`,
    );
}

// Flags `<schema>.member` / `<schema>["member"]` where member isn't safeParse/parse/~standard.
function checkMemberExpression(node: AstNode, bindings: SchemaBindings, id: string): void {
    const reference = schemaReference(node.object, bindings);
    if (reference === undefined) {
        return;
    }
    if (node.computed === true) {
        const literal = literalStringValue(node.property);
        if (literal === undefined) {
            throw dynamicAccessError(id, `${reference}[…]`);
        }
        if (!ALLOWED_MEMBERS.has(literal)) {
            throw forbiddenMemberError(id, `${reference}.${literal}`);
        }
        return;
    }
    const propertyName = identifierName(node.property);
    if (propertyName === undefined || ALLOWED_MEMBERS.has(propertyName)) {
        return;
    }
    throw forbiddenMemberError(id, `${reference}.${propertyName}`);
}

// Flags `const { optional } = <schema>` (any key beyond safeParse/parse/~standard).
function checkDestructuring(node: AstNode, bindings: SchemaBindings, id: string): void {
    const reference = schemaReference(node.init, bindings);
    if (reference === undefined) {
        return;
    }
    const pattern = node.id;
    if (!isNode(pattern) || pattern.type !== 'ObjectPattern' || !Array.isArray(pattern.properties)) {
        return;
    }
    for (const property of pattern.properties) {
        // A RestElement (`...rest`) captures only the remaining members, which on the
        // stand-in are at most safeParse/parse/~standard — nothing to flag.
        if (!isNode(property) || property.type !== 'Property') {
            continue;
        }
        const key = staticKey(property.computed, property.key);
        if (key === undefined) {
            throw dynamicAccessError(id, `{ […] } = ${reference}`);
        }
        if (!ALLOWED_MEMBERS.has(key)) {
            throw forbiddenDestructureError(id, reference, key);
        }
    }
}

// Throws on the first forbidden use of a `.schema.ts` import.
function checkSchemaImportUsage(code: string, id: string): void {
    // Cheap gate: skip the parse entirely unless the module mentions a schema import.
    if (!code.includes('.schema')) {
        return;
    }
    const ast = parseAst(code);
    const bindings = collectSchemaBindings(ast);
    if (bindings.named.size === 0 && bindings.namespace.size === 0) {
        return;
    }
    walk(ast, (node) => {
        if (node.type === 'MemberExpression') {
            checkMemberExpression(node, bindings, id);
            return;
        }
        if (node.type === 'VariableDeclarator') {
            checkDestructuring(node, bindings, id);
        }
    });
}

export { checkSchemaImportUsage };
