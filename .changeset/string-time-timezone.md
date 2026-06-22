---
"@paseri/paseri": minor
---

Add `offset` and `local` options to `string().time()`, matching `string().datetime()`. `local` defaults to `true`, so `time()` accepts bare `hh:mm:ss` or a trailing `Z`; `offset: true` also accepts `±hh:mm`, and `local: false` requires a timezone designator.
