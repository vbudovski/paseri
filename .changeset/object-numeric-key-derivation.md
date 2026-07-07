---
"@paseri/paseri": patch
---

`.pick()`, `.omit()`, `.partial()`, and `.required()` now work on objects with numeric keys (e.g. `p.object({ 1: p.string() })`). Previously `.pick(1)` threw `Object must contain at least one field.` and `.omit(1)` / `.partial(1)` / `.required(1)` silently did nothing.
