---
"@paseri/paseri": patch
---

Passthrough-mode objects with unrecognised keys parse ~35-40% faster: the parser no longer collects unrecognised keys it never consumes in that mode.
