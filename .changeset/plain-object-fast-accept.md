---
"@paseri/paseri": minor
"@paseri/compiler": minor
---

`isPlainObject` accepts `constructor === Object` before the reflective prototype check: ~10% faster object and record validation at runtime, ~28% for compiled validators. Objects whose `constructor` resolves to `Object` through a longer prototype chain (e.g. `Object.create({ ... })`) are now treated as plain; such values only arise from in-process prototype manipulation, never from serialised input.
