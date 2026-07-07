---
"@paseri/paseri": patch
---

`p.string().emoji()` now rejects bare emoji component code points — digits, `#`, `*`, and lone regional indicators — that previously validated as emoji. Per Unicode, these are emoji only inside a sequence, so keycaps (`1️⃣`), flags (`🇦🇺`), and other emoji sequences are still accepted.
