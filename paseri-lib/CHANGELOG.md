# @paseri/paseri

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
