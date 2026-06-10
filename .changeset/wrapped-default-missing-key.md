---
"@paseri/paseri": patch
"@paseri/compiler": patch
---

A missing object key whose default is wrapped (e.g. `.default(...).nullable()` or `.default(...).refine(...)`) now substitutes the default instead of reporting `missing_value`, behaving exactly like an explicit `undefined`: the whole wrapper chain runs, so refinements judge the substituted value.
