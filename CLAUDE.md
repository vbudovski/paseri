## Tooling
- Deno workspace; members listed in `deno.json`.
- Use Deno, not npm. Run `deno task check` to validate lint + formatting (read-only; exits non-zero on findings).
- Lint + formatting uses biome (configured via `deno task check`). Never run `deno fmt` — its default style differs from the project's biome config.
- Commits are enforced via commitlint — read `commitlint.config.ts` for the rules before writing a commit message.

## TypeScript
- `isolatedDeclarations` is enabled — exported functions/values in `paseri-lib` need explicit return types.
- `exactOptionalPropertyTypes` is enabled — `prop?: T` and `prop: T | undefined` are not interchangeable.
- Relative imports must include the `.ts` extension (Deno style).
- Avoid `as any` / bare `any` — they mask real type errors. Use a precise cast to the actual type, or restructure; reserve `any` for cases genuinely inexpressible in the latest TS and justify it inline. Applies to generated code too.

## Tests
- Use `@std/testing/bdd` (`describe` / `it`) with `@std/expect`.
- Prefer black-box tests — assert what callers of the module can observe, not internal state. For schemas this means the value/messages from `safeParse` / `parse`; don't reach into private fields or the internal `TreeNode` shape of `result.issue`. Justify any internal peek inline.
- To assert that a callback was (or wasn't) invoked, use `spy` + `assertSpyCalls` from `@std/testing/mock` rather than ad-hoc counters or boolean flags.
- Prefer property-based tests with `fast-check` over hand-rolled example tables when the input space is non-trivial — generative by default. For bound/comparison checks, draw both the bound and the value and derive the expected outcome from the same operator the schema uses; one such property subsumes fixed and negative cases, so delete the narrow blocks it covers. Reserve fixed examples for cases a property can't reach (extremely-unlikely boundaries, valid-regex generation) and for builder-level checks (e.g. throws on a NaN bound).
- Run with `deno test -P`. The `-P` flag applies the permissions configured in `deno.json`; without it the suite fails on permission prompts.
- `paseri-compiler`'s generated modules must pass strict `deno check`. The AOT parity harness (`aot-shadow`) transpiles types away, so generated-output type-validity is NOT covered by parity — verify it separately (generate a representative schema and `deno check` the emitted source).

## Style
- Capitalise "Paseri" in prose (comments, docs); lowercase only for literal package names like `paseri-lib`, `paseri-compiler`, `paseri-docs`.

## Benchmarks
- Benchmarks live in `paseri-lib/bench/` as `*.bench.ts` files using `Deno.bench`. Each group defines a `Paseri` baseline alongside `Zod` and `Valita` for cross-library comparison.
- Run all benches with `deno bench`.
- To check for Paseri-only regressions, use `deno bench --filter Paseri` — this skips the comparison libraries.
- Add or update a benchmark when changing a hot validation path.
