---
"@paseri/paseri": minor
---

`toIR()` graphs now include `cycles` — the named entries that actually participate in a recursion cycle — so consumers can distinguish true recursion from forward references and shared subtrees.
