---
"@paseri/paseri": patch
---

`p.string().time({ offset: true })` and `p.string().datetime({ offset: true })` now reject a timezone offset whose hour is above 23 (e.g. `12:34:56+45:00`). The offset hour is validated as 00-23, matching the time-of-day hour.
