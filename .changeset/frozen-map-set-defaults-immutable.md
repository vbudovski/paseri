---
"@paseri/paseri": patch
"@paseri/compiler": patch
---

`Map` and `Set` `.default()` values are now truly immutable. Previously `Object.freeze` left their `set`/`add`/`delete`/`clear` methods working, so the shared default could be mutated and the change leaked into every later parse. Those mutators now throw, matching frozen plain objects.
