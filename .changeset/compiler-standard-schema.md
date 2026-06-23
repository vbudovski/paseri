---
"@paseri/paseri": minor
"@paseri/compiler": minor
"@paseri/vite-plugin": minor
---

`@paseri/compiler` now emits a single exported object named after the schema (e.g. `Greeting`) that mirrors the runtime schema's surface: `Greeting.safeParse(...)`, `Greeting.parse(...)`, and a [Standard Schema](https://standardschema.dev) `Greeting['~standard']`. The compiled module is a drop-in replacement for the runtime schema and can be handed directly to any Standard Schema consumer (tRPC, TanStack Form, Drizzle, …).

**Breaking:** the free-function exports `safeParse<Name>` / `parse<Name>` are removed. Migrate `safeParseGreeting(x)` → `Greeting.safeParse(x)` and `parseGreeting(x)` → `Greeting.parse(x)`.

`@paseri/paseri` adds the types/helpers the generated module imports from its `/internal` subpath, so the new compiler output requires this version.

`@paseri/vite-plugin` now produces this same object for `*.schema.ts` exports (so AOT-compiled schemas are usable as Standard Schemas), and its dev/build guard allows `['~standard']` access alongside `.safeParse` / `.parse`.
