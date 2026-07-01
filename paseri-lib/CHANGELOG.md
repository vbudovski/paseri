# @paseri/paseri

## 1.9.3

### Patch Changes

- 0751fbe: `.default()` now accepts Temporal values. Passing one previously threw `DataCloneError: ... could not be cloned.` at schema construction, before any parse. All Temporal types are supported: `Instant`, `PlainDate`, `PlainDateTime`, `PlainMonthDay`, `PlainTime`, `PlainYearMonth`, `ZonedDateTime`, and `Duration`.

## 1.9.2

### Patch Changes

- ff2791c: `p.number()` bound contradictions that hinge on a ±Infinity bound now throw `Lower bound must not exceed upper bound.` at construction (e.g. `p.number().gte(-Infinity).lt(-Infinity)`), matching the finite cases. Previously they silently built a schema that rejects every input. Single-value intervals such as `p.number().lte(Infinity).gte(Infinity)` remain valid.

## 1.9.1

### Patch Changes

- 8513b4b: `p.string().length(n)` now throws `Minimum length must not exceed maximum length.` when the fixed length contradicts an existing `min`/`max` bound (e.g. `p.string().min(5).length(3)`), matching `string().min(5).max(3)` and the other bounded schemas. Previously this path silently built a schema that rejects every input.

## 1.9.0

### Minor Changes

- f020ab6: Contradictory bounds now throw at construction instead of producing a schema that rejects every input. `p.string().min(5).max(3)`, `p.number().gte(5).lte(3)`, and the equivalents on `array`, `set`, `map`, `bigint`, `date`, and the Temporal schemas throw immediately (e.g. `Minimum length must not exceed maximum length.`). Equal bounds such as `p.number().gte(5).lte(5)` remain valid.

## 1.8.0

### Minor Changes

- 611a407: `@paseri/compiler` now emits a single exported object named after the schema (e.g. `Greeting`) that mirrors the runtime schema's surface: `Greeting.safeParse(...)`, `Greeting.parse(...)`, and a [Standard Schema](https://standardschema.dev) `Greeting['~standard']`. The compiled module is a drop-in replacement for the runtime schema and can be handed directly to any Standard Schema consumer (tRPC, TanStack Form, Drizzle, …).

  **Breaking:** the free-function exports `safeParse<Name>` / `parse<Name>` are removed. Migrate `safeParseGreeting(x)` → `Greeting.safeParse(x)` and `parseGreeting(x)` → `Greeting.parse(x)`.

  `@paseri/paseri` adds the types/helpers the generated module imports from its `/internal` subpath, so the new compiler output requires this version.

  `@paseri/vite-plugin` now produces this same object for `*.schema.ts` exports (so AOT-compiled schemas are usable as Standard Schemas), and its dev/build guard allows `['~standard']` access alongside `.safeParse` / `.parse`.

## 1.7.0

### Minor Changes

- b3c02ae: Add `offset` and `local` options to `string().time()`, matching `string().datetime()`. `local` defaults to `true`, so `time()` accepts bare `hh:mm:ss` or a trailing `Z`; `offset: true` also accepts `±hh:mm`, and `local: false` requires a timezone designator.
- d8476d9: Add `string().url()`, validating URLs with `URL.canParse` (the WHATWG parser), so it accepts any valid URL of any scheme.

## 1.6.0

### Minor Changes

- a6a9545: Optimise all-literal unions (`p.union(p.literal(…), …)`) with an O(1) `Set` membership check, matching `p.enum`. Invalid values now report a single `invalid_enum_value` issue instead of a per-member error tree.
- 9b477cc: Preserve the inner schema's concrete type through `optional()` and `refine()`: `required()` recovers the original subclass instead of the abstract base, and `Infer` treats an `optional().refine(...)` field as an optional key.

### Patch Changes

- 99a734f: Fix `Infer` returning `{}` instead of `unknown` for `unknown` schemas.

## 1.5.0

### Minor Changes

- 47b2a15: `isPlainObject` accepts `constructor === Object` before the reflective prototype check: ~10% faster object and record validation at runtime, ~28% for compiled validators. Objects whose `constructor` resolves to `Object` through a longer prototype chain (e.g. `Object.create({ ... })`) are now treated as plain; such values only arise from in-process prototype manipulation, never from serialised input.

### Patch Changes

- c042555: Derived object schemas (merge/pick/omit/partial/required) parse ~30% faster: field lookups now go through a Map, sidestepping V8's slower keyed loads on runtime-assembled shapes. Literal-shaped schemas are unchanged.

## 1.4.0

### Minor Changes

- 58ecc55: `toIR()` graphs now include `cycles` — the named entries that actually participate in a recursion cycle — so consumers can distinguish true recursion from forward references and shared subtrees.
- ab87d72: Union IR nodes record the discriminator key the runtime selected at construction; the compiler dispatches on the recorded key instead of re-deriving the selection rule. Generated output is unchanged.

### Patch Changes

- ecb54d3: JSR documentation fixes: the landing-page examples now pass a locale to `messages()`, and `toSource` documents the `parse<Name>` export alongside `safeParse<Name>`.
- e472338: Passthrough-mode objects with unrecognised keys parse ~35-40% faster: the parser no longer collects unrecognised keys it never consumes in that mode.
- 33a05e0: Temporal bound checks are 6-20x faster: Instant and ZonedDateTime bounds compare by precomputed epoch nanoseconds, and Plain\* bounds compare by ISO fields when both sides use the iso8601 calendar.

## 1.3.0

### Minor Changes

- e62eab8: `Infer` now derives object key optionality from the schema kind, not the value type. An `.optional()` field infers as `key?: T | undefined` — an explicit `undefined` passes through, so the key can be present holding it; the old `key?: T` permitted compile-clean crashes under `exactOptionalPropertyTypes`. Optional and nullable compose in either order. A field that merely accepts the value `undefined` (e.g. `p.union(p.string(), p.undefined())`) is a required key, and `.refine()`/`.chain()`-wrapped fields infer as required keys (stricter than the runtime, never unsound). Compiled validators' type annotations follow the same rules (and stay faithful even through `.refine()`).
- 44ac10f: `p.object()` now rejects symbol-keyed shape fields at construction (`Object fields must use string keys.`) and at the type level. Such fields were previously accepted but silently ignored by the parser — never validated, never required, dropped by strip mode — and are unrepresentable in compiled validators.

### Patch Changes

- 0ece07d: Union discriminator detection now tries every shared literal key instead of only the first, so a union no longer throws at construction when a later key discriminates. The error remains when no candidate key has distinct values; compiled validators select the same key as the runtime.
- 1f8c07a: Object schemas now validate own non-enumerable fields, which were previously passed through unvalidated by the runtime and treated as missing by compiled validators. A hidden field is still readable at its declared key, so it is validated like any other; defaults are no longer substituted over a present hidden value.
- 7646ba2: Own `__proto__` keys now behave correctly in Annex B environments (browsers, Node.js): default fills and modified values are no longer lost to the inherited prototype setter, strip mode sanitises children under a `__proto__` key, and schemas declaring a `__proto__` field compile. Deno, which removes the accessor, was unaffected.
- 82853be: `.strip()` no longer drops default-filled fields when the input contains an unrecognised key, in both the runtime parser and compiled validators.
- 4825be3: A missing object key whose default is wrapped (e.g. `.default(...).nullable()` or `.default(...).refine(...)`) now substitutes the default instead of reporting `missing_value`, behaving exactly like an explicit `undefined`: the whole wrapper chain runs, so refinements judge the substituted value.

## 1.2.1

### Patch Changes

- 80d169e: Document the `introspect` subpath: add a module overview with a usage example and JSDoc for each exported IR type (`IR`, `IRGraph`, `SerializedCallback`, and the `*Check` constraint aliases).

## 1.2.0

### Minor Changes

- 8fe88ea: Renamed the published package from `@vbudovski/paseri` to `@paseri/paseri`. Update imports to the new specifier; the `introspect` and `locales` subpaths carry over unchanged (`@paseri/paseri/introspect`, `@paseri/paseri/locales`).

### Patch Changes

- 4dd1bf3: Improve `parse` performance by avoiding an unnecessary allocation and unwrapping of the value.
- 473ba56: Reject empty tuple and object schemas at runtime on top of existing type checks.
- 2d2d2b7: Reject undersized union and empty enum schemas at runtime on top of existing type checks.
- 8c34f00: Invoke `.refine()` / `.chain()` callbacks without a `this` receiver. A non-arrow callback's `this` was previously bound to the internal schema instance (only ever exposing private fields); depending on it was never supported. Arrow callbacks and explicitly-bound functions are unaffected.

## 1.1.0

### Minor Changes

- 021a7b7: Add a `maxDepth` option to `safeParse` / `parse` that caps the nesting depth of recursive input on `lazy()` schemas, preventing attacker-controlled deeply nested values from stack-overflowing the runtime. The default of `1000` is generous and rarely needs changing; deeper input is rejected with a `too_deep` issue. Override per call: `schema.safeParse(data, { maxDepth: 5000 })`.

## 1.0.1

### Patch Changes

- Clone `Date` bounds passed to `date().min()` / `date().max()` so later mutation of the caller's `Date` object cannot shift the schema's bound after construction.
- Reject negative and non-integer length/size bounds at schema-construction time on `array`, `string`, `map`, and `set`. Calling `.length(-1)` or `.min(1.5)` now throws instead of silently producing a schema that can never match.
- Make `literal(NaN)` accept `NaN`. Previously the strict-equality comparison rejected its own value; comparison now uses SameValueZero so `NaN === NaN` for the purposes of literal matching.
- Reject collisions produced by element transforms in `map` and `set`. When a key/element schema's transform causes two distinct inputs to map to the same output, parsing now reports a `duplicate_key` issue instead of silently dropping the earlier value.
