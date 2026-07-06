---
"@paseri/compiler": patch
---

A refine/chain callback that references a `const` with a non-fixed value (e.g. `Date.now()`) is no longer compiled into a validator holding a one-off snapshot of it — the compiler can't reproduce such a value, so it leaves the schema uncompiled rather than bake in one that differs from the runtime. Separately, a source file is re-read after it changes on disk, so a watch/dev rebuild reflects edits to a referenced helper instead of reusing a stale parse.
