---
"@vbudovski/paseri": minor
---

Add a `maxDepth` option to `safeParse` / `parse` that caps the nesting depth of recursive input on `lazy()` schemas, preventing attacker-controlled deeply nested values from stack-overflowing the runtime. The default of `1000` is generous and rarely needs changing; deeper input is rejected with a `too_deep` issue. Override per call: `schema.safeParse(data, { maxDepth: 5000 })`.
