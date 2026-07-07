---
"@paseri/paseri": patch
---

An object schema now rejects an invalid value in a non-enumerable own property when the input also carries an inherited enumerable key; that combination previously let the invalid value pass unvalidated. Only objects built with `Object.create` / `Object.defineProperty` can trigger it — JSON, object literals, and spreads are unaffected.
