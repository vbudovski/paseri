# @paseri/compiler

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
