---
"@paseri/paseri": patch
---

`p.string().email()` now rejects an address whose domain label ends with a hyphen (e.g. `foo@a-.com`), matching the hostname-label rule that a label may not begin or end with `-`. Interior hyphens (`foo@a-b.com`) remain valid.
