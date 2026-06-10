---
"@paseri/paseri": patch
"@paseri/compiler": patch
---

Own `__proto__` keys now behave correctly in Annex B environments (browsers, Node.js): default fills and modified values are no longer lost to the inherited prototype setter, strip mode sanitises children under a `__proto__` key, and schemas declaring a `__proto__` field compile. Deno, which removes the accessor, was unaffected.
