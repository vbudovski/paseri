---
"@paseri/paseri": patch
---

A `.strip()` object schema now keeps a validated non-enumerable own property in its output instead of dropping it while removing unrecognised keys. Only reachable for objects built with `Object.create` / `Object.defineProperty`; JSON, object literals, and spreads are unaffected.
