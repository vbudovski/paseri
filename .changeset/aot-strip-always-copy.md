---
"@paseri/compiler": patch
---

Strip-mode object validators build their output inline from the validated fields (required keys as a static-key literal, optionals when present) instead of scanning for extra keys and rebuilding on the slow path. ~54% faster on clean input, ~84% when extra keys are present. The returned object is now always a fresh copy.
