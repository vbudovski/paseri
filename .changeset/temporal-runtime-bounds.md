---
"@paseri/paseri": patch
---

Temporal bound checks are 6-20x faster: Instant and ZonedDateTime bounds compare by precomputed epoch nanoseconds, and Plain* bounds compare by ISO fields when both sides use the iso8601 calendar.
