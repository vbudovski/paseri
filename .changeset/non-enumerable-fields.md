---
"@paseri/paseri": patch
"@paseri/compiler": patch
---

Object schemas now validate own non-enumerable fields, which were previously passed through unvalidated by the runtime and treated as missing by compiled validators. A hidden field is still readable at its declared key, so it is validated like any other; defaults are no longer substituted over a present hidden value.
