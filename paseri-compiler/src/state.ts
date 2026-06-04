// Codegen-time state threaded through every emitter.

import type { SerializedCallback } from '@vbudovski/paseri/introspect';
import ts from 'typescript';
import {
    bigintLiteral,
    call,
    constStatement,
    falseLiteral,
    identifier,
    literalExpression,
    newExpression,
    nullExpression,
    numericLiteral,
    objectLiteral,
    property,
    stringLiteral,
    trueLiteral,
    undefinedExpression,
    unknownType,
} from './builders.ts';

const { factory } = ts;

/**
 * Where an emitter routes its outcome. `return` means the emitter is at a function boundary and any failure should
 * `return` a `Result` directly; `accumulate` means it's inside a container and failures append to a shared issue
 * list, with modified values optionally piped back via an `OutputSlot`.
 */
type Sink = ReturnSink | AccumulateSink;

/** Sink at a function boundary — emitter returns a `Result` whose success value is `valueExpression`. */
interface ReturnSink {
    readonly kind: 'return';
    readonly valueExpression: ts.Expression;
    /**
     * The enclosing function's output type (`emitType(ir)`). Success values are cast to it (`value as OutputType`)
     * rather than `as any`, so the runtime-validated-but-statically-wider value satisfies the typed `ParseResult`
     * return while still catching a grossly-mistyped success value.
     */
    readonly outputType: ts.TypeNode;
}

/** Channel a child uses to pass a (possibly transformed) output back up to its container parent. */
interface OutputSlot {
    /** Identifier the child writes the (possibly transformed) value to. */
    readonly target: ts.Identifier;
    /** Boolean flag the child sets to `true` after writing `target`; lets the parent skip the input value otherwise. */
    readonly isModified: ts.Identifier;
}

/** Sink inside a container — emitter appends failures to a shared issue list rather than returning. */
interface AccumulateSink {
    readonly kind: 'accumulate';
    /** Identifier of the issue node the child should attach failures under (`addIssue(issue, …)`). */
    readonly issueIdentifier: ts.Identifier;
    /** Key path the child reports under, or `undefined` when the child sits at the issue root. */
    readonly keyExpression: ts.Expression | undefined;
    /** Channel for the child to propagate a modified value back to its parent. Omitted when no transform applies. */
    readonly outputSlot?: OutputSlot;
}

interface State {
    /** Monotonic suffix source for fresh identifiers (`freshIdentifier` / `hoistConstant`). */
    counter: number;
    /** Maps a `.default()` value to its hoisted identifier (by reference), so repeats reuse one declaration. */
    readonly defaults: Map<unknown, ts.Identifier>;
    /** Maps a regex's `[source, flags]` (JSON-encoded) to its hoisted identifier, so identical regexes share one `new RegExp`. */
    readonly regexCache: Map<string, ts.Identifier>;
    /**
     * Maps an enum's typed value-set to its hoisted `Set` identifier, so identical enums share one declaration —
     * across distinct fields and across the fast-path (shape) and slow-path arms of a single field.
     */
    readonly enumCache: Map<string, ts.Identifier>;
    /** Maps a temporal bound's `${kind}|${value}` to its hoisted identifier, so `.min(b).max(b)` shares one declaration. */
    readonly boundsCache: Map<string, ts.Identifier>;
    /**
     * Maps a container shape-helper's normalized body (bound locals renamed, free references preserved) to its hoisted
     * identifier, so structurally-identical helpers (e.g. two `array(string)` fields) share one declaration.
     */
    readonly shapeHelperCache: Map<string, ts.Identifier>;
    /**
     * Module-scope declarations to splice ahead of the entry functions: hoisted consts (defaults, enum `Set`s,
     * temporal bounds) plus emitted shape-helper functions. Printed through the TypeScript printer, unlike `textHoists`.
     */
    readonly hoistedDeclarations: ts.Statement[];
    /**
     * Raw textual hoists. Used for content that should NOT round-trip through the TypeScript printer — e.g.,
     * refine/chain callbacks parsed from a user-supplied source, whose AST positions point into a different
     * `SourceFile` and would render as garbage when printed in this module's context. Each entry is a fully-formed
     * top-level statement string.
     */
    readonly textHoists: string[];
    /** Import declarations to splice at the very top of the generated module — ES syntax requires them first. */
    readonly importHoists: string[];
    /**
     * Bare module specifiers the caller has vouched for. Any other bare specifier the resolver encounters still
     * throws at compile time, so typos and unverified packages can't silently slip through.
     */
    readonly trustedBareSpecifiers: ReadonlySet<string>;
    /**
     * Depth to pass to any `ref` call emitted at the current position.
     * `0` at the top-level entry; `depth + 1` inside a named lazy function body.
     */
    currentDepth: ts.Expression;
    /**
     * Identifier referring to the `maxDepth` parameter in scope. `undefined`
     * when the graph has no `ref` nodes (no depth threading needed).
     */
    maxDepthIdentifier: ts.Identifier | undefined;
    /**
     * Maps a refine/chain `SerializedCallback` to its already-hoisted predicate identifier, so repeated visits to the
     * same IR node share one hoisted const declaration.
     */
    readonly callbackCache: WeakMap<SerializedCallback, ts.Identifier>;
    /**
     * Per named (lazy/recursive) graph entry, whether validating it can modify the value. Precomputed in `toSource`
     * via a fixpoint so `ref` nodes resolve to their target's actual modify-ness instead of a conservative `true`,
     * letting pure recursive schemas keep the object fast path. Empty until `toSource` populates it.
     */
    namedCanModify: ReadonlyMap<string, boolean>;
    /**
     * Identifiers the generated module already binds — runtime helpers, the internal import, the entry/slow functions,
     * and named (lazy) graph entries. A refine/chain callback whose resolved free identifier would clash with one of
     * these is rejected (`ResolutionError`) rather than emitted, since a clash is otherwise a duplicate-binding
     * SyntaxError or a silent function rebind. Empty until `toSource` populates it.
     */
    reservedIdentifiers: ReadonlySet<string>;
}

function makeState(trustedBareSpecifiers: ReadonlySet<string> = new Set()): State {
    return {
        counter: 0,
        defaults: new Map(),
        regexCache: new Map(),
        enumCache: new Map(),
        boundsCache: new Map(),
        shapeHelperCache: new Map(),
        hoistedDeclarations: [],
        textHoists: [],
        importHoists: [],
        trustedBareSpecifiers,
        currentDepth: numericLiteral(0),
        maxDepthIdentifier: undefined,
        callbackCache: new WeakMap(),
        namedCanModify: new Map(),
        reservedIdentifiers: new Set(),
    };
}

function freshIdentifier(state: State, prefix: string): ts.Identifier {
    state.counter += 1;
    return identifier(`_${prefix}${state.counter}`);
}

/**
 * Hoists `const <prefix><N> = <expr>;` to module scope. Use for values built
 * once at module load and referenced repeatedly (e.g., temporal bounds).
 */
function hoistConstant(state: State, prefix: string, expression: ts.Expression): ts.Identifier {
    const result = freshIdentifier(state, prefix);
    state.hoistedDeclarations.push(constStatement(result, undefined, expression));
    return result;
}

/**
 * Hoists `const _regexN = new RegExp(source, flags)` to module scope, deduplicated by source+flags so identical
 * regexes (e.g. the same `.email()` across several fields, or the fast-path and slow-path arms of one field) share a
 * single declaration — fewer `new RegExp` compilations at module load and a smaller module. Stateless across calls
 * (callers reset `lastIndex` for global/sticky regexes), so sharing one instance is safe.
 */
function hoistRegex(state: State, source: string, flags: string): ts.Identifier {
    const key = JSON.stringify([source, flags]);
    const existing = state.regexCache.get(key);
    if (existing !== undefined) {
        return existing;
    }
    const result = hoistConstant(
        state,
        'regex',
        newExpression(identifier('RegExp'), undefined, [stringLiteral(source), stringLiteral(flags)]),
    );
    state.regexCache.set(key, result);
    return result;
}

/**
 * Hoists `const _enumN = new Set<unknown>([...values])` to module scope, deduplicated by the typed value-set so an
 * enum reused across fields — and the fast-path (shape) and slow-path arms of a single field — share one `Set`. The
 * key is JSON over `[typeof, String(value)]` pairs, so `1` (number) and `'1'` (string) never collide and no separator
 * can appear inside a value; declaration order is part of the key, so a differently-ordered duplicate simply misses
 * the dedup (never shares the wrong set).
 */
function hoistEnum(state: State, values: readonly (string | number | bigint | boolean)[]): ts.Identifier {
    const key = JSON.stringify(values.map((value) => [typeof value, String(value)]));
    const existing = state.enumCache.get(key);
    if (existing !== undefined) {
        return existing;
    }
    const setInit = newExpression(
        identifier('Set'),
        [unknownType],
        [
            factory.createArrayLiteralExpression(
                values.map((value) => literalExpression(value)),
                false,
            ),
        ],
    );
    const result = hoistConstant(state, 'enum', setInit);
    state.enumCache.set(key, result);
    return result;
}

/**
 * Hoists a temporal bound (`Instant`, `PlainDate`, …) as a module-scope const, deduplicated by `${kind}|${value}` so
 * `.min(b).max(b)` — or the same bound reused across fields — shares one declaration rather than reconstructing the
 * value twice at module load. Keyed by string value (not reference), so two equal-but-distinct bounds still share.
 */
function hoistTemporalBound(state: State, temporalKind: string, value: unknown): ts.Identifier {
    const key = `${temporalKind}|${String(value)}`;
    const existing = state.boundsCache.get(key);
    if (existing !== undefined) {
        return existing;
    }
    const result = hoistConstant(state, 'bound', valueToExpression(value));
    state.boundsCache.set(key, result);
    return result;
}

/**
 * Hoists a `.default()` value as a module-scope
 * `const _defaultN = deepFreeze(structuredClone(<value>))` and returns the
 * identifier. Repeat calls with the same value (by reference) reuse the declaration.
 */
function registerDefault(state: State, value: unknown): ts.Identifier {
    const existing = state.defaults.get(value);
    if (existing !== undefined) {
        return existing;
    }
    const result = identifier(`_default${state.defaults.size}`);
    state.defaults.set(value, result);
    const valueExpression = valueToExpression(value);
    state.hoistedDeclarations.push(
        constStatement(
            result,
            undefined,
            call(identifier('deepFreeze'), [call(identifier('structuredClone'), [valueExpression])]),
        ),
    );
    return result;
}

/** Emits `Temporal.<className>.from('<isoString>')` — shared shape used by the Temporal branches in `valueToExpression`. */
function temporalFromExpression(className: string, isoString: string): ts.Expression {
    return call(property(property(identifier('Temporal'), className), 'from'), [stringLiteral(isoString)]);
}

/** Converts a default value into a TypeScript expression literal. */
function valueToExpression(value: unknown): ts.Expression {
    if (value === null) {
        return nullExpression;
    }
    if (value === undefined) {
        return undefinedExpression;
    }
    if (typeof value === 'string') {
        return stringLiteral(value);
    }
    if (typeof value === 'number') {
        return literalExpression(value);
    }
    if (typeof value === 'boolean') {
        return value ? trueLiteral : falseLiteral;
    }
    if (typeof value === 'bigint') {
        return bigintLiteral(value);
    }
    if (Array.isArray(value)) {
        return factory.createArrayLiteralExpression(value.map(valueToExpression), false);
    }
    if (value instanceof Date) {
        return newExpression(identifier('Date'), undefined, [stringLiteral(value.toISOString())]);
    }
    if (typeof Temporal !== 'undefined') {
        if (value instanceof Temporal.Instant) {
            return temporalFromExpression('Instant', value.toString());
        }
        if (value instanceof Temporal.PlainDate) {
            return temporalFromExpression('PlainDate', value.toString());
        }
        if (value instanceof Temporal.PlainDateTime) {
            return temporalFromExpression('PlainDateTime', value.toString());
        }
        if (value instanceof Temporal.PlainMonthDay) {
            return temporalFromExpression('PlainMonthDay', value.toString());
        }
        if (value instanceof Temporal.PlainTime) {
            return temporalFromExpression('PlainTime', value.toString());
        }
        if (value instanceof Temporal.PlainYearMonth) {
            return temporalFromExpression('PlainYearMonth', value.toString());
        }
        if (value instanceof Temporal.ZonedDateTime) {
            return temporalFromExpression('ZonedDateTime', value.toString());
        }
    }
    if (value instanceof Set) {
        return newExpression(identifier('Set'), undefined, [
            factory.createArrayLiteralExpression([...value].map(valueToExpression), false),
        ]);
    }
    if (value instanceof Map) {
        return newExpression(identifier('Map'), undefined, [
            factory.createArrayLiteralExpression(
                [...value].map(([key, inner]) =>
                    factory.createArrayLiteralExpression([valueToExpression(key), valueToExpression(inner)], false),
                ),
                false,
            ),
        ]);
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);
        return objectLiteral(Object.fromEntries(entries.map(([key, inner]) => [key, valueToExpression(inner)])));
    }
    throw new Error(`Cannot embed value of type ${typeof value} into generated source.`);
}

export {
    type AccumulateSink,
    freshIdentifier,
    hoistConstant,
    hoistEnum,
    hoistRegex,
    hoistTemporalBound,
    makeState,
    type OutputSlot,
    type ReturnSink,
    registerDefault,
    type Sink,
    type State,
    valueToExpression,
};
