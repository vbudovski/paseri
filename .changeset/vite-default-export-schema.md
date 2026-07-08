---
"@paseri/vite-plugin": patch
---

A `.schema.ts` that exports its schema as the module default (`export default p.object(…)`) now compiles, instead of failing the build with "no Paseri schema exports".
