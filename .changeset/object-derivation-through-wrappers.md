---
"@paseri/paseri": patch
---

`.required()` and `.partial()` now see through the `nullable` and `refine` wrappers. Previously `.required()` silently no-op'd on `.optional().nullable()` / `.optional().refine()` fields (a missing key was still accepted); it now strips the optional layer while keeping the field nullable/refined, matching TypeScript's `Required`. `.partial()` now keeps the default fill on a wrapped default (e.g. `.optional().default(v).refine(...)`) instead of dropping it, and the field's inferred type no longer offers a `.default()` that throws when called.
