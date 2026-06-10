---
"@paseri/paseri": minor
"@paseri/compiler": minor
---

`Infer` now derives object key optionality from the schema kind, not the value type. An `.optional()` field infers as `key?: T | undefined` — an explicit `undefined` passes through, so the key can be present holding it; the old `key?: T` permitted compile-clean crashes under `exactOptionalPropertyTypes`. Optional and nullable compose in either order. A field that merely accepts the value `undefined` (e.g. `p.union(p.string(), p.undefined())`) is a required key, and `.refine()`/`.chain()`-wrapped fields infer as required keys (stricter than the runtime, never unsound). Compiled validators' type annotations follow the same rules (and stay faithful even through `.refine()`).
