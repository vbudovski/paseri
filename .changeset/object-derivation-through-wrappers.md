---
"@paseri/paseri": patch
---

`.required()` and `.partial()` now see through the `nullable` and `refine` wrappers. Previously `.required()` silently no-op'd on `.optional().nullable()` / `.optional().refine()` fields (a missing key was still accepted); it now strips the optional layer while keeping the field nullable/refined, matching TypeScript's `Required`. `.partial()` now keeps the default fill on a wrapped default (e.g. `.optional().default(v).refine(...)`) instead of dropping it, and no longer widens kept fields to a type whose `.default` is absent at runtime.
