---
"@paseri/paseri": patch
"@paseri/compiler": patch
---

`p.record()` now infers `Record<string, Element>` instead of `Record<PropertyKey, Element>`. The old type claimed symbol-keyed values were `Element`, but the runtime never validates symbol keys — they pass through untouched, the same way object schemas treat them. The narrowed type matches that string-keyed behaviour; numeric-literal access (`result[1]`) still works and `keyof` is still `string | number`.
