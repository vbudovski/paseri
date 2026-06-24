---
"@paseri/compiler": patch
---

Fix the compiled date validator reporting a bound leaf (`too_dated` / `too_recent`) alongside `invalid_date` for a `min`/`max`-constrained date nested in a container. The invalid-date guard now short-circuits the bound checks, matching the runtime.
