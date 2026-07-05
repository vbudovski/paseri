---
"@paseri/paseri": patch
"@paseri/compiler": patch
---

`.default()` now handles more value kinds correctly. A Temporal instance nested inside a mutable default (e.g. `p.object({ when: p.plainDate() }).optional().default({ when })`) previously threw `DataCloneError` at construction; it now works. Top-level Temporal defaults are frozen, so a property added to one parsed result can't leak into later parses. Function and symbol defaults are now rejected at construction: a default must be a value Paseri can clone and reproduce, which a function or symbol isn't.
