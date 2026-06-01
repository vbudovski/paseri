[![Release](https://github.com/vbudovski/paseri/actions/workflows/release.yml/badge.svg)](https://github.com/vbudovski/paseri/actions/workflows/release.yml)

---

# Paseri workspace

Deno workspace for [Paseri](https://paseri.dev), a TypeScript parsing and validation library.

## Workspace

- [`paseri-lib`](https://github.com/vbudovski/paseri/tree/main/paseri-lib) &mdash; the validation library, published to
  JSR as [`@vbudovski/paseri`](https://jsr.io/@vbudovski/paseri).
- [`paseri-docs`](https://github.com/vbudovski/paseri/tree/main/paseri-docs) &mdash; the
  [paseri.dev](https://paseri.dev) documentation site, built with [Astro](https://astro.build/) and
  [Starlight](https://starlight.astro.build/).

## Developer guide

Paseri uses the [Deno](https://deno.com/) runtime rather than Node, and requires Deno 2.7 or later. Packages are
published to the [JSR registry](https://jsr.io/) only, and publishing is performed automatically by CI.

### Setup

After cloning the repository, be sure you set up the git hooks using the following command:

```shell
deno task init
```

### Running tests

```shell
deno test -P
```

### Running benchmarks

```shell
deno bench
```
