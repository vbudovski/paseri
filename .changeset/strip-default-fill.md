---
"@paseri/paseri": patch
"@paseri/compiler": patch
---

`.strip()` no longer drops default-filled fields when the input contains an unrecognised key, in both the runtime parser and compiled validators.
