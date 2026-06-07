// Intermediate representation of a Paseri schema's structure. The shape is a graph rather than a tree so that cycles
// introduced via LazySchema can be broken with named refs.

/**
 * Serialisable graph form of a Paseri schema, produced by `schema.toIR()`. The structure is a graph rather than a
 * tree so that cycles introduced via `lazy()` can be broken: `entry` is the root node, and `named` holds shared nodes
 * referenced by `{ kind: 'ref' }` entries elsewhere in the graph.
 */
interface IRGraph {
    readonly entry: IR;
    readonly named: Readonly<Record<string, IR>>;
}

/**
 * A single node in an {@link IRGraph}. A discriminated union keyed by `kind`, with one arm per Paseri schema type;
 * composite arms (`array`, `object`, `union`, …) nest further `IR` nodes for their children.
 */
type IR =
    | { kind: 'string'; checks: readonly StringCheck[] }
    | { kind: 'number'; checks: readonly NumberCheck[] }
    | { kind: 'bigint'; checks: readonly BigIntCheck[] }
    | { kind: 'boolean' }
    | { kind: 'symbol' }
    | { kind: 'null' }
    | { kind: 'undefined' }
    | { kind: 'never' }
    | { kind: 'unknown' }
    | { kind: 'literal'; value: string | number | bigint | boolean }
    | { kind: 'enum'; values: readonly (string | number | bigint | boolean)[] }
    | { kind: 'array'; element: IR; checks: readonly LengthCheck[] }
    | { kind: 'tuple'; elements: readonly IR[] }
    | { kind: 'set'; element: IR; checks: readonly SizeCheck[] }
    | { kind: 'map'; key: IR; value: IR; checks: readonly SizeCheck[] }
    | { kind: 'record'; element: IR }
    | { kind: 'object'; fields: Readonly<Record<string, IR>>; mode: ObjectMode }
    | { kind: 'union'; members: readonly IR[] }
    | { kind: 'optional'; inner: IR }
    | { kind: 'nullable'; inner: IR }
    | { kind: 'default'; inner: IR; value: unknown }
    | { kind: 'date'; checks: readonly TemporalCheck<Date>[] }
    | { kind: 'duration' }
    | { kind: 'instant'; checks: readonly TemporalCheck<Temporal.Instant>[] }
    | { kind: 'plainDate'; checks: readonly TemporalCheck<Temporal.PlainDate>[] }
    | { kind: 'plainDateTime'; checks: readonly TemporalCheck<Temporal.PlainDateTime>[] }
    | { kind: 'plainMonthDay' }
    | { kind: 'plainTime'; checks: readonly TemporalCheck<Temporal.PlainTime>[] }
    | { kind: 'plainYearMonth'; checks: readonly TemporalCheck<Temporal.PlainYearMonth>[] }
    | { kind: 'zonedDateTime'; checks: readonly TemporalCheck<Temporal.ZonedDateTime>[] }
    | { kind: 'ref'; name: string }
    | {
          kind: 'refine';
          inner: IR;
          callback: SerializedCallback;
          code: string;
          path: readonly (string | number)[];
          params?: Record<string, unknown>;
      }
    | { kind: 'chain'; from: IR; to: IR; callback: SerializedCallback }
    | { kind: 'unsupported'; schema: 'refine' | 'chain'; reason: string };

/**
 * Serialised form of a `.refine()` / `.chain()` callback, captured at schema-construction time. Carries the callback
 * source plus enough surrounding context (parameter names, free identifiers, call site) for paseri-compiler to
 * re-emit it ahead of time.
 */
interface SerializedCallback {
    readonly source: string;
    readonly name: string;
    readonly arity: number;
    readonly parameterNames: readonly string[];
    readonly freeIdentifiers: readonly string[];
    /**
     * URL of the file where `.refine()` / `.chain()` was constructed. Set when the host produces a parseable stack at
     * construction time. Used by paseri-compiler's source-file resolver to look up free identifiers.
     */
    readonly callSiteFile?: string;
}

/** How an `object` node treats keys not declared in its schema: drop them, reject them, or pass them through. */
type ObjectMode = 'strip' | 'strict' | 'passthrough';

/** A validation constraint recorded on a `string` node, mirroring the chainable checks on a string schema. */
type StringCheck =
    | { name: 'min' | 'max'; value: number }
    | { name: 'includes' | 'startsWith' | 'endsWith'; value: string }
    | {
          name: 'regex' | 'email' | 'emoji' | 'uuid' | 'nanoid' | 'date' | 'time' | 'datetime' | 'ip' | 'cidr';
          source: string;
          flags: string;
      };

/** A validation constraint recorded on a `number` node, mirroring the chainable checks on a number schema. */
type NumberCheck = { name: 'gt' | 'gte' | 'lt' | 'lte'; value: number } | { name: 'int' | 'finite' | 'safe' };

/** A validation constraint recorded on a `bigint` node, mirroring the chainable checks on a bigint schema. */
type BigIntCheck = { name: 'gt' | 'gte' | 'lt' | 'lte'; value: bigint };

/** A length constraint recorded on an `array` node. */
type LengthCheck = { name: 'min' | 'max'; value: number };

/** A size constraint recorded on a `set` or `map` node. */
type SizeCheck = { name: 'min' | 'max'; value: number };

/** A bound constraint recorded on a temporal node (`date`, `instant`, `plainDate`, …), parameterised by its value type. */
type TemporalCheck<ValueType> = { name: 'min' | 'max'; value: ValueType };

// Recursion state threaded through every `_emit(context)` call.
interface IRContext {
    readonly visited: WeakMap<object, string>;
    readonly named: Record<string, IR>;
    nextId: number;
}

export type {
    BigIntCheck,
    IR,
    IRContext,
    IRGraph,
    LengthCheck,
    NumberCheck,
    ObjectMode,
    SerializedCallback,
    SizeCheck,
    StringCheck,
    TemporalCheck,
};
