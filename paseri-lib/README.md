[![Coverage](https://gist.githubusercontent.com/vbudovski/80548a1b87f9f00fe1ae426ca6a2a517/raw/vbudovski_paseri_main-coverage.svg)](https://github.com/vbudovski/paseri/actions/workflows/release.yml)
[![Bundle Size](https://gist.githubusercontent.com/vbudovski/80548a1b87f9f00fe1ae426ca6a2a517/raw/vbudovski_paseri_main-bundlesize.svg)](https://github.com/vbudovski/paseri/actions/workflows/release.yml)
[![JSR](https://jsr.io/badges/@paseri/paseri)](https://jsr.io/@paseri/paseri)
[![JSR Score](https://jsr.io/badges/@paseri/paseri/score)](https://jsr.io/@paseri/paseri)

---

# Paseri

A TypeScript parsing and validation library for structured data. Ensure that untrusted input from users or external
APIs conforms to the expected format.

Why the name? It's the Japanese name for parsley (パセリ), and also a play on words on parse/parsing, which is the goal
of this library.

## Installation

```shell
deno add jsr:@paseri/paseri
```

```shell
bunx jsr add @paseri/paseri
```

```shell
pnpm add jsr:@paseri/paseri
```

```shell
yarn add jsr:@paseri/paseri
```

```shell
npx jsr add @paseri/paseri
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
* A full-featured parser API for real-world data structures.
* Honest validator contracts, even when stricter or less ergonomic than alternatives.
* Immutability of schemas. This avoids a lot of bugs caused by mutating references to non-primitive types.

## Documentation

https://paseri.dev

---

[^1]: While higher performance is possible using dynamic code execution (JIT) or ahead-of-time (AOT) compilation, these
approaches
introduce [security risks](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_direct_eval!)
or added build complexity.

[^2]: An [excellent article](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/) on the concept of
type-driven design.

---

Part of the [Paseri workspace](https://github.com/vbudovski/paseri).
