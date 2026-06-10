---
"@paseri/paseri": patch
"@paseri/compiler": patch
---

Union discriminator detection now tries every shared literal key instead of only the first, so a union no longer throws at construction when a later key discriminates. The error remains when no candidate key has distinct values; compiled validators select the same key as the runtime.
