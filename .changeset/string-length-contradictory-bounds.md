---
"@paseri/paseri": patch
---

`p.string().length(n)` now throws `Minimum length must not exceed maximum length.` when the fixed length contradicts an existing `min`/`max` bound (e.g. `p.string().min(5).length(3)`), matching `string().min(5).max(3)` and the other bounded schemas. Previously this path silently built a schema that rejects every input.
