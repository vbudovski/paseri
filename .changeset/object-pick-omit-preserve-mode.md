---
"@paseri/paseri": patch
---

`.pick()` and `.omit()` now preserve the object's mode. Previously they reverted to `strict`, so `.strip().pick(...)` rejected extra keys and `.passthrough().omit(...)` dropped them.
