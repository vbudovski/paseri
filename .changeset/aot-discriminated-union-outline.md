---
"@paseri/compiler": patch
---

Discriminated union members are outlined into hoisted helpers, keeping wide unions below V8's optimise-size limit: ~36% faster invalid-input validation on a 24-variant union.
