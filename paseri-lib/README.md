[![Release](https://github.com/vbudovski/paseri/actions/workflows/release.yml/badge.svg)](https://github.com/vbudovski/paseri/actions/workflows/release.yml)
[![Coverage](https://gist.githubusercontent.com/vbudovski/80548a1b87f9f00fe1ae426ca6a2a517/raw/vbudovski_paseri_main-coverage.svg)](https://github.com/vbudovski/paseri/actions/workflows/release.yml)
[![Bundle Size](https://gist.githubusercontent.com/vbudovski/80548a1b87f9f00fe1ae426ca6a2a517/raw/vbudovski_paseri_main-bundlesize.svg)](https://github.com/vbudovski/paseri/actions/workflows/release.yml)
[![JSR](https://jsr.io/badges/@vbudovski/paseri)](https://jsr.io/@vbudovski/paseri)
[![JSR Score](https://jsr.io/badges/@vbudovski/paseri/score)](https://jsr.io/@vbudovski/paseri)

---

# Paseri

A TypeScript parsing and validation library for structured data. Ensure that untrusted input from users or external
APIs conforms to the expected format.

Why the name? It's the Japanese name for parsley (パセリ), and also a play on words on parse/parsing, which is the goal
of this library.

## Installation

```shell
deno add jsr:@vbudovski/paseri
```

```shell
bunx jsr add @vbudovski/paseri
```

```shell
pnpm i jsr:@vbudovski/paseri
```

```shell
yarn add jsr:@vbudovski/paseri
```

```shell
npx jsr add @vbudovski/paseri
```

## Acknowledgements

### Zod

Paseri is heavily inspired by [Zod](https://github.com/colinhacks/zod)'s expressive API. While Zod is the industry
standard for general-purpose validation, Paseri was built to bring that same developer experience to
performance-critical applications and environments where Zod's architecture may be a bottleneck &mdash; all while
maintaining a zero-compromise approach to security.

### Valita

[Valita](https://github.com/badrap/valita) sets the high water-mark for performance in the TypeScript ecosystem[^1].
Paseri matches or exceeds this raw efficiency while offering a more expansive, Zod-like feature set, and a focus on
schema immutability.

## Goals

The list may be expanded over time, but for now the objectives are the following:

* Parsing and validation of untrusted input to ensure it conforms to the expected format. A successful result will
  be typed with the narrowest possible definition to obviate the need to do additional validation at the point of
  usage[^2].
* High performance[^1] and usability in a strict
  [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) environment.
* An API that is *reasonably* close to that of Zod. One-to-one compatibility is not the intention.
* Immutability of schemas. This avoids a lot of bugs caused by mutating references to non-primitive types.

## Documentation

https://paseri.dev

## Developer guide

Paseri uses the [Deno](https://deno.com/) runtime rather than Node, and requires Deno 2.5.5 or later. Packages are
published to the [JSR registry](https://jsr.io/) only, and publishing is performed automatically by CI.

* `paseri-lib` contains the sources for the library.
* `paseri-docs` contains the documentation, built with [Astro](https://astro.build/) and
  [Starlight](https://starlight.astro.build/).

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

---

[^1]: While higher performance is possible using dynamic code execution (JIT) or ahead-of-time (AOT) compilation, these
approaches
introduce [security risks](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_direct_eval!)
or added build complexity.

[^2]: An [excellent article](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/) on the concept of
type-driven design.
