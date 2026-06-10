---
"@paseri/compiler": minor
---

Compiled validators inline acyclic `lazy()` targets (forward references and shared subtrees) at their use sites with statically-tracked depth boundaries, instead of emitting named functions and threading depth parameters through the module: ~3.5% faster on valid input for the forward-reference pattern, at some emitted-size cost for multiply-referenced targets.
