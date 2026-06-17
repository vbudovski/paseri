---
"@paseri/paseri": minor
"@paseri/compiler": minor
---

Optimise all-literal unions (`p.union(p.literal(…), …)`) with an O(1) `Set` membership check, matching `p.enum`. Invalid values now report a single `invalid_enum_value` issue instead of a per-member error tree.
