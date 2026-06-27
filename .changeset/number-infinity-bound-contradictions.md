---
"@paseri/paseri": patch
---

`p.number()` bound contradictions that hinge on a ±Infinity bound now throw `Lower bound must not exceed upper bound.` at construction (e.g. `p.number().gte(-Infinity).lt(-Infinity)`), matching the finite cases. Previously they silently built a schema that rejects every input. Single-value intervals such as `p.number().lte(Infinity).gte(Infinity)` remain valid.
