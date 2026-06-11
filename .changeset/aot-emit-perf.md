---
"@paseri/compiler": patch
---

Compiled validators stay below V8's optimise-size limit (nested object validation outlines into hoisted, deduplicated helpers) and read each entry field once instead of re-loading it per check: ~30% faster invalid-input validation on wide nested schemas, ~34-77% faster valid-input validation on wide objects, and up to ~66% smaller emitted modules.
