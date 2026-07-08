---
"@paseri/compiler": patch
---

A compiled object schema with a `.default()` field now rejects a plain-looking object whose own `constructor` is `undefined`. Previously it was accepted.
