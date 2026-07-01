# @paseri/compiler

## 0.7.3

### Patch Changes

- 0751fbe: `.default()` now accepts Temporal values. Passing one previously threw `DataCloneError: ... could not be cloned.` at schema construction, before any parse. All Temporal types are supported: `Instant`, `PlainDate`, `PlainDateTime`, `PlainMonthDay`, `PlainTime`, `PlainYearMonth`, `ZonedDateTime`, and `Duration`.

## 0.7.2

### Patch Changes

- c91b419: Fix the compiled result type of a `default` whose inner schema still admits `undefined` (e.g. `p.union(p.string(), p.undefined()).optional().default('x')`): `safeParse`/`parse` now report `string | undefined` instead of `string`, matching the runtime's `Infer`.

## 0.7.1

### Patch Changes

- be87b16: Fix the compiled date validator reporting a bound leaf (`too_dated` / `too_recent`) alongside `invalid_date` for a `min`/`max`-constrained date nested in a container. The invalid-date guard now short-circuits the bound checks, matching the runtime.
- 0593d48: `safeParse` / `parse` on a compiled schema now reject an invalid `maxDepth` (e.g. `0` or `NaN`) by throwing `maxDepth must be a positive integer.`, matching the runtime. Some generated validators previously accepted it silently.

## 0.7.0

### Minor Changes

- 611a407: `@paseri/compiler` now emits a single exported object named after the schema (e.g. `Greeting`) that mirrors the runtime schema's surface: `Greeting.safeParse(...)`, `Greeting.parse(...)`, and a [Standard Schema](https://standardschema.dev) `Greeting['~standard']`. The compiled module is a drop-in replacement for the runtime schema and can be handed directly to any Standard Schema consumer (tRPC, TanStack Form, Drizzle, …).

  **Breaking:** the free-function exports `safeParse<Name>` / `parse<Name>` are removed. Migrate `safeParseGreeting(x)` → `Greeting.safeParse(x)` and `parseGreeting(x)` → `Greeting.parse(x)`.

  `@paseri/paseri` adds the types/helpers the generated module imports from its `/internal` subpath, so the new compiler output requires this version.

  `@paseri/vite-plugin` now produces this same object for `*.schema.ts` exports (so AOT-compiled schemas are usable as Standard Schemas), and its dev/build guard allows `['~standard']` access alongside `.safeParse` / `.parse`.

## 0.6.0

### Minor Changes

- d8476d9: Add `string().url()`, validating URLs with `URL.canParse` (the WHATWG parser), so it accepts any valid URL of any scheme.

## 0.5.1

### Patch Changes

- 2ac1c44: Speed up strip-mode objects in generated validators: nested strip objects, and strip objects with defaults, are rebuilt as a static-key literal that drops unknown keys by construction instead of scanning and bailing to the slow path. Output is unchanged; inputs carrying extra keys are markedly faster.

## 0.5.0

### Minor Changes

- a6a9545: Optimise all-literal unions (`p.union(p.literal(…), …)`) with an O(1) `Set` membership check, matching `p.enum`. Invalid values now report a single `invalid_enum_value` issue instead of a per-member error tree.

### Patch Changes

- 9f6052c: Emit `unknown` instead of `any` as the element type in generated record casts.
- 4d02d3e: Emit `Record<PropertyKey, V>` for compiled record schemas, matching the runtime's `Infer`.

## 0.4.1

### Patch Changes

- e66483a: Strip-mode object validators build their output inline from the validated fields (required keys as a static-key literal, optionals when present) instead of scanning for extra keys and rebuilding on the slow path. ~54% faster on clean input, ~84% when extra keys are present. The returned object is now always a fresh copy.

## 0.4.0

### Minor Changes

- 47b2a15: `isPlainObject` accepts `constructor === Object` before the reflective prototype check: ~10% faster object and record validation at runtime, ~28% for compiled validators. Objects whose `constructor` resolves to `Object` through a longer prototype chain (e.g. `Object.create({ ... })`) are now treated as plain; such values only arise from in-process prototype manipulation, never from serialised input.

### Patch Changes

- d4da16f: Discriminated union members are outlined into hoisted helpers, keeping wide unions below V8's optimise-size limit: ~36% faster invalid-input validation on a 24-variant union.

## 0.3.0

### Minor Changes

- 58ecc55: Compiled validators inline acyclic `lazy()` targets (forward references and shared subtrees) at their use sites with statically-tracked depth boundaries, instead of emitting named functions and threading depth parameters through the module: ~3.5% faster on valid input for the forward-reference pattern, at some emitted-size cost for multiply-referenced targets.

### Patch Changes

- 4109c4d: Compiled validators stay below V8's optimise-size limit (nested object validation outlines into hoisted, deduplicated helpers) and read each entry field once instead of re-loading it per check: ~30% faster invalid-input validation on wide nested schemas, ~34-77% faster valid-input validation on wide objects, and up to ~66% smaller emitted modules.
- 213829d: Compiled validators keep the shape fast path for schemas with lazy (recursive) fields and for containers of strict-mode objects: ~12-18% faster on valid input for the affected schemas, with allocation-free success paths.
- ab87d72: Union IR nodes record the discriminator key the runtime selected at construction; the compiler dispatches on the recorded key instead of re-deriving the selection rule. Generated output is unchanged.
- ecb54d3: JSR documentation fixes: the landing-page examples now pass a locale to `messages()`, and `toSource` documents the `parse<Name>` export alongside `safeParse<Name>`.
- 5d28a82: Generated modules with a refine inside an array, set, map, or record element now pass strict `deno check`: the refine before-snapshot const is explicitly annotated, breaking a loop back-edge inference cycle (TS7022).
- 9b42484: Compiled validators no longer let a later union member accept input that the runtime resolves by applying an earlier member's default.
- 9b42484: Unions on the accumulate path skip their issue machinery when a member shape-matches cleanly. Generated modules no longer carry dead shape helpers or duplicate trailing success returns.

## 0.2.0

### Minor Changes

- e62eab8: `Infer` now derives object key optionality from the schema kind, not the value type. An `.optional()` field infers as `key?: T | undefined` — an explicit `undefined` passes through, so the key can be present holding it; the old `key?: T` permitted compile-clean crashes under `exactOptionalPropertyTypes`. Optional and nullable compose in either order. A field that merely accepts the value `undefined` (e.g. `p.union(p.string(), p.undefined())`) is a required key, and `.refine()`/`.chain()`-wrapped fields infer as required keys (stricter than the runtime, never unsound). Compiled validators' type annotations follow the same rules (and stay faithful even through `.refine()`).

### Patch Changes

- 82853be: Compiled validators no longer accept objects missing a required key whose schema accepts `undefined` (`unknown()`, `undefined()`, or a `.default()` of such), matching the runtime's `missing_value` behaviour.
- 0ece07d: Union discriminator detection now tries every shared literal key instead of only the first, so a union no longer throws at construction when a later key discriminates. The error remains when no candidate key has distinct values; compiled validators select the same key as the runtime.
- 1f8c07a: Object schemas now validate own non-enumerable fields, which were previously passed through unvalidated by the runtime and treated as missing by compiled validators. A hidden field is still readable at its declared key, so it is validated like any other; defaults are no longer substituted over a present hidden value.
- 7646ba2: Own `__proto__` keys now behave correctly in Annex B environments (browsers, Node.js): default fills and modified values are no longer lost to the inherited prototype setter, strip mode sanitises children under a `__proto__` key, and schemas declaring a `__proto__` field compile. Deno, which removes the accessor, was unaffected.
- 82853be: `.strip()` no longer drops default-filled fields when the input contains an unrecognised key, in both the runtime parser and compiled validators.
- 4825be3: A missing object key whose default is wrapped (e.g. `.default(...).nullable()` or `.default(...).refine(...)`) now substitutes the default instead of reporting `missing_value`, behaving exactly like an explicit `undefined`: the whole wrapper chain runs, so refinements judge the substituted value.

## 0.1.0

### Minor Changes

- Initial release. Ahead-of-time compiler that turns a Paseri schema into a TypeScript module containing the parser, eliminating runtime schema traversal.
