---
"@paseri/compiler": patch
---

`safeParse` / `parse` on a compiled schema now reject an invalid `maxDepth` (e.g. `0` or `NaN`) by throwing `maxDepth must be a positive integer.`, matching the runtime. Some generated validators previously accepted it silently.
