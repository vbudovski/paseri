---
"@paseri/vite-plugin": patch
---

The plugin's usage guard now recognises schema imports written without the `.ts` extension (e.g. `import { User } from './user.schema'`), not just `./user.schema.ts`. A derivation call on such an import (e.g. `User.optional()`) is now flagged at build time instead of slipping through to a runtime failure.
