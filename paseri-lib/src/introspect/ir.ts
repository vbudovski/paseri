// Intermediate representation of a Paseri schema's structure. The shape is a graph rather than a tree so that cycles
// introduced via LazySchema can be broken with named refs.

interface IRGraph {
    readonly entry: IR;
    readonly named: Readonly<Record<string, IR>>;
}

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

type ObjectMode = 'strip' | 'strict' | 'passthrough';

type StringCheck =
    | { name: 'min' | 'max'; value: number }
    | { name: 'includes' | 'startsWith' | 'endsWith'; value: string }
    | {
          name: 'regex' | 'email' | 'emoji' | 'uuid' | 'nanoid' | 'date' | 'time' | 'datetime' | 'ip' | 'cidr';
          source: string;
          flags: string;
      };

type NumberCheck = { name: 'gt' | 'gte' | 'lt' | 'lte'; value: number } | { name: 'int' | 'finite' | 'safe' };

type BigIntCheck = { name: 'gt' | 'gte' | 'lt' | 'lte'; value: bigint };

type LengthCheck = { name: 'min' | 'max'; value: number };

type SizeCheck = { name: 'min' | 'max'; value: number };

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
