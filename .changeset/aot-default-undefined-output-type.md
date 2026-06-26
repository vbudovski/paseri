---
"@paseri/compiler": patch
---

Fix the compiled result type of a `default` whose inner schema still admits `undefined` (e.g. `p.union(p.string(), p.undefined()).optional().default('x')`): `safeParse`/`parse` now report `string | undefined` instead of `string`, matching the runtime's `Infer`.
