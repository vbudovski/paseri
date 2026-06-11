---
"@paseri/compiler": patch
---

Generated modules with a refine inside an array, set, map, or record element now pass strict `deno check`: the refine before-snapshot const is explicitly annotated, breaking a loop back-edge inference cycle (TS7022).
