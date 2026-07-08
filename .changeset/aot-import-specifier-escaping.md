---
"@paseri/compiler": patch
---

Compiling a schema whose refine/chain callback imports from a path containing an apostrophe (e.g. `/Users/o'brien/schema.ts`) no longer emits a module with a `SyntaxError`.
