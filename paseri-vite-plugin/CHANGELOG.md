# @paseri/vite-plugin

## 0.2.2

### Patch Changes

- 3963cbb: A `.schema.ts` file that exports a schema under a string name (e.g. `export { schema as "my-schema" }`) no longer breaks the build with a `SyntaxError`.
- e32d00a: A `.schema.ts` that exports its schema as the module default (`export default p.object(…)`) now compiles, instead of failing the build with "no Paseri schema exports".

## 0.2.1

### Patch Changes

- bec6f8e: The plugin's usage guard now recognises schema imports written without the `.ts` extension (e.g. `import { User } from './user.schema'`), not just `./user.schema.ts`. A derivation call on such an import (e.g. `User.optional()`) is now flagged at build time instead of slipping through to a runtime failure.

## 0.2.0

### Minor Changes

- 611a407: `@paseri/compiler` now emits a single exported object named after the schema (e.g. `Greeting`) that mirrors the runtime schema's surface: `Greeting.safeParse(...)`, `Greeting.parse(...)`, and a [Standard Schema](https://standardschema.dev) `Greeting['~standard']`. The compiled module is a drop-in replacement for the runtime schema and can be handed directly to any Standard Schema consumer (tRPC, TanStack Form, Drizzle, …).

  **Breaking:** the free-function exports `safeParse<Name>` / `parse<Name>` are removed. Migrate `safeParseGreeting(x)` → `Greeting.safeParse(x)` and `parseGreeting(x)` → `Greeting.parse(x)`.

  `@paseri/paseri` adds the types/helpers the generated module imports from its `/internal` subpath, so the new compiler output requires this version.

  `@paseri/vite-plugin` now produces this same object for `*.schema.ts` exports (so AOT-compiled schemas are usable as Standard Schemas), and its dev/build guard allows `['~standard']` access alongside `.safeParse` / `.parse`.

## 0.1.0

### Minor Changes

- ab571fa: Initial release. Vite plugin that AOT-compiles Paseri schemas at build time.
