---
"@paseri/compiler": patch
---

A compiled object schema with a field named `__proto__` (or `constructor`, etc.) carrying a wrapped default now fires that default when the field is absent, instead of failing with `invalid_type` in browsers/Node.js.
