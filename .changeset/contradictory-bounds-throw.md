---
"@paseri/paseri": minor
---

Contradictory bounds now throw at construction instead of producing a schema that rejects every input. `p.string().min(5).max(3)`, `p.number().gte(5).lte(3)`, and the equivalents on `array`, `set`, `map`, `bigint`, `date`, and the Temporal schemas throw immediately (e.g. `Minimum length must not exceed maximum length.`). Equal bounds such as `p.number().gte(5).lte(5)` remain valid.
