---
"@paseri/compiler": patch
---

A compiled object schema with both a `-0` default and a `0` default now keeps them distinct, instead of emitting `-0` for both.
