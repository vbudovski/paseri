---
"@paseri/paseri": patch
"@paseri/compiler": patch
---

`.default()` now throws `A default value cannot be a <type>.` at construction when given a value it can't faithfully store — a RegExp, typed array, Error, or other class instance (at any depth). Previously such a value was silently corrupted.
