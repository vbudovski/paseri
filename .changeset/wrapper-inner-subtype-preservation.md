---
"@paseri/paseri": minor
---

Preserve the inner schema's concrete type through `optional()` and `refine()`: `required()` recovers the original subclass instead of the abstract base, and `Infer` treats an `optional().refine(...)` field as an optional key.
