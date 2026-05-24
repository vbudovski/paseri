# @vbudovski/paseri

## 1.0.1

### Patch Changes

- Clone `Date` bounds passed to `date().min()` / `date().max()` so later mutation of the caller's `Date` object cannot shift the schema's bound after construction.
- Reject negative and non-integer length/size bounds at schema-construction time on `array`, `string`, `map`, and `set`. Calling `.length(-1)` or `.min(1.5)` now throws instead of silently producing a schema that can never match.
- Make `literal(NaN)` accept `NaN`. Previously the strict-equality comparison rejected its own value; comparison now uses SameValueZero so `NaN === NaN` for the purposes of literal matching.
- Reject collisions produced by element transforms in `map` and `set`. When a key/element schema's transform causes two distinct inputs to map to the same output, parsing now reports a `duplicate_key` issue instead of silently dropping the earlier value.
