import type { IR } from '@paseri/paseri/introspect';
import type ts from 'typescript';

type ObjectIR = Extract<IR, { kind: 'object' }>;
type FieldIR = ObjectIR['fields'][string];

function isFieldOptional(ir: FieldIR): boolean {
    if (ir.kind === 'optional') {
        return true;
    }
    if (ir.kind === 'nullable' || ir.kind === 'refine') {
        return isFieldOptional(ir.inner);
    }
    return false;
}

/**
 * Whether a default fires for undefined input — the IR mirror of the runtime's `_hasDefault`:
 * nullable/refine delegate, chain is a semantic boundary.
 */
function containsDefault(ir: FieldIR): boolean {
    if (ir.kind === 'default') {
        return true;
    }
    if (ir.kind === 'nullable' || ir.kind === 'refine') {
        return containsDefault(ir.inner);
    }
    return false;
}

function safeIdentifier(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Field names that conflict with Object.prototype if accessed via the `in`
 * operator or dot/bracket lookup. When any schema field shares one, the fast
 * path bails and the dispatch loop's `for..in` is used instead.
 */
const PROTOTYPE_NAMES: Set<string> = new Set<string>([
    '__proto__',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
    'constructor',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
    'toString',
    'valueOf',
]);

function shadowsPrototype(name: string): boolean {
    return PROTOTYPE_NAMES.has(name);
}

/**
 * Captures one strict-or-strip object level encountered during the shape walk so the caller can emit a follow-up
 * extras check after the shape check. `requiredCount` is the number of always-present fields; `optionalFieldNames`
 * are the optional fields' keys, used to count how many are actually present. The extras threshold is
 * `requiredCount + (present optionals)` rather than the static field count: an absent optional would otherwise
 * leave room for an unknown key without the input key count exceeding the field count.
 */
type StrictLevel = {
    readonly valueExpression: ts.Expression;
    readonly requiredCount: number;
    readonly optionalFieldNames: readonly string[];
};

/**
 * IR kinds eligible for the shape-entry split (tiny entry + cold `_slow*`).
 * Primitives are fast as single functions and don't benefit from the split.
 */
const SHAPE_ENTRY_ELIGIBLE_KINDS: Set<IR['kind']> = new Set<IR['kind']>([
    'object',
    'tuple',
    'union',
    'array',
    'record',
    'set',
    'map',
    'ref',
]);

export {
    containsDefault,
    type FieldIR,
    isFieldOptional,
    type ObjectIR,
    PROTOTYPE_NAMES,
    SHAPE_ENTRY_ELIGIBLE_KINDS,
    type StrictLevel,
    safeIdentifier,
    shadowsPrototype,
};
