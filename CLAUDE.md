## Tooling
- Deno workspace with two members: `paseri-lib` (validation library, published to JSR) and `paseri-docs` (Astro + Preact docs site).
- Use Deno, not npm. Run `deno task check` to validate lint + formatting (read-only; exits non-zero on findings).
- Commits are enforced via commitlint — read `commitlint.config.ts` for the rules before writing a commit message.

## TypeScript
- `isolatedDeclarations` is enabled — exported functions/values in `paseri-lib` need explicit return types.
- `exactOptionalPropertyTypes` is enabled — `prop?: T` and `prop: T | undefined` are not interchangeable.
- Relative imports must include the `.ts` extension (Deno style).

## Tests
- Use `@std/testing/bdd` (`describe` / `it`) with `@std/expect`.
- Prefer property-based tests with `fast-check` over hand-rolled example tables when the input space is non-trivial.
- Run with `deno test -P`. The `-P` flag applies the permissions configured in `deno.json`; without it the suite fails on permission prompts.

## Benchmarks
- Benchmarks live in `paseri-lib/bench/` as `*.bench.ts` files using `Deno.bench`. Each group defines a `Paseri` baseline alongside `Zod` and `Valita` for cross-library comparison.
- Run all benches with `deno bench`.
- To check for Paseri-only regressions, use `deno bench --filter Paseri` — this skips the comparison libraries.
- Add or update a benchmark when changing a hot validation path.
