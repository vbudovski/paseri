---
"@paseri/paseri": patch
---

Derived object schemas (merge/pick/omit/partial/required) parse ~30% faster: field lookups now go through a Map, sidestepping V8's slower keyed loads on runtime-assembled shapes. Literal-shaped schemas are unchanged.
