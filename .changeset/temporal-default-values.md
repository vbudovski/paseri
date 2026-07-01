---
"@paseri/paseri": patch
"@paseri/compiler": patch
---

`.default()` now accepts Temporal values. Passing one previously threw `DataCloneError: ... could not be cloned.` at schema construction, before any parse. All Temporal types are supported: `Instant`, `PlainDate`, `PlainDateTime`, `PlainMonthDay`, `PlainTime`, `PlainYearMonth`, `ZonedDateTime`, and `Duration`.
