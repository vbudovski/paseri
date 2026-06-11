---
"@paseri/compiler": patch
---

Compiled validators no longer let a later union member accept input that the runtime resolves by applying an earlier member's default.
