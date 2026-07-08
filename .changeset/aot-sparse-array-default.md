---
"@paseri/compiler": patch
---

Compiling a schema with a sparse-array default (e.g. `[1, , 3]`) no longer crashes the compiler with an opaque `TypeError`.
