---
"@paseri/compiler": patch
---

Compiled validators keep the shape fast path for schemas with lazy (recursive) fields and for containers of strict-mode objects: ~12-18% faster on valid input for the affected schemas, with allocation-free success paths.
