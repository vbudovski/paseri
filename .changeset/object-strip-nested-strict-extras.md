---
"@paseri/compiler": patch
---

A compiled `.strip()` object with a `.default()` field now handles unknown keys inside a nested `.strict()` or `.strip()` object correctly, matching the runtime: rejected for `.strict()`, dropped for `.strip()`. Previously the generated validator let them through.
