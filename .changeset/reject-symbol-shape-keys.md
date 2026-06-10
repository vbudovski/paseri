---
"@paseri/paseri": minor
---

`p.object()` now rejects symbol-keyed shape fields at construction (`Object fields must use string keys.`) and at the type level. Such fields were previously accepted but silently ignored by the parser — never validated, never required, dropped by strip mode — and are unrepresentable in compiled validators.
