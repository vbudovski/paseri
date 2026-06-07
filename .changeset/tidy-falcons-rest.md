---
"@vbudovski/paseri": patch
---

Invoke `.refine()` / `.chain()` callbacks without a `this` receiver. A non-arrow callback's `this` was previously bound to the internal schema instance (only ever exposing private fields); depending on it was never supported. Arrow callbacks and explicitly-bound functions are unaffected.
