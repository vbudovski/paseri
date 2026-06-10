---
"@paseri/compiler": patch
---

Compiled validators no longer accept objects missing a required key whose schema accepts `undefined` (`unknown()`, `undefined()`, or a `.default()` of such), matching the runtime's `missing_value` behaviour.
