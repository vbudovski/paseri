---
"@paseri/vite-plugin": patch
---

A `.schema.ts` file that exports a schema under a string name (e.g. `export { schema as "my-schema" }`) no longer breaks the build with a `SyntaxError`.
