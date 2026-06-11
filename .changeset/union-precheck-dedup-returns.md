---
"@paseri/compiler": patch
---

Unions on the accumulate path skip their issue machinery when a member shape-matches cleanly. Generated modules no longer carry dead shape helpers or duplicate trailing success returns.
