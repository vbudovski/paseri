# @paseri/paseri

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
