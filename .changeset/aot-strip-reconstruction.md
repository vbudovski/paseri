---
"@paseri/compiler": patch
---

Speed up strip-mode objects in generated validators: nested strip objects, and strip objects with defaults, are rebuilt as a static-key literal that drops unknown keys by construction instead of scanning and bailing to the slow path. Output is unchanged; inputs carrying extra keys are markedly faster.
