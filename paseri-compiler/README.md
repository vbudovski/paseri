[![Coverage](https://gist.githubusercontent.com/vbudovski/80548a1b87f9f00fe1ae426ca6a2a517/raw/vbudovski_paseri-compiler_main-coverage.svg)](https://github.com/vbudovski/paseri/actions/workflows/release.yml)
[![JSR](https://jsr.io/badges/@vbudovski/paseri-compiler)](https://jsr.io/@vbudovski/paseri-compiler)
[![JSR Score](https://jsr.io/badges/@vbudovski/paseri-compiler/score)](https://jsr.io/@vbudovski/paseri-compiler)

---

# paseri-compiler

Ahead-of-time compiler for [Paseri](https://github.com/vbudovski/paseri/blob/main/paseri-lib/README.md). Given a
Paseri schema, it emits a TypeScript source file containing the parser, for faster validation.

## Installation

```shell
deno add jsr:@vbudovski/paseri jsr:@vbudovski/paseri-compiler
```

```shell
bunx jsr add @vbudovski/paseri @vbudovski/paseri-compiler
```

```shell
pnpm add jsr:@vbudovski/paseri jsr:@vbudovski/paseri-compiler
```

```shell
yarn add jsr:@vbudovski/paseri jsr:@vbudovski/paseri-compiler
```

```shell
npx jsr add @vbudovski/paseri @vbudovski/paseri-compiler
```

## Usage

Compile a schema to a TypeScript module:

```typescript
import * as p from '@vbudovski/paseri';
import '@vbudovski/paseri/introspect';
import { toSource } from '@vbudovski/paseri-compiler';

const schema = p.object({
    hello: p.string(),
});

const source = toSource(schema.toIR(), { name: 'Greeting' });
// Write `source` to a file (e.g. `greeting.ts`) as part of your build.
```

The generated module exports `safeParseGreeting` &mdash; a drop-in for the runtime schema that returns the same
`ParseResult`, compiled ahead of time for faster parsing:

```typescript ignore
import { en } from '@vbudovski/paseri/locales';
import { safeParseGreeting } from './greeting.ts';

const data = { hello: 'world' };
const result = safeParseGreeting(data);
if (result.ok) {
    console.log(`Hello ${result.value.hello}!`);
} else {
    const messages = result.messages(en);
    throw new Error(`Parsing failed: ${messages}`);
}
```

It also exports a throwing `parseGreeting` &mdash; the counterpart of the runtime schema's `parse`, returning the
validated value directly or throwing a `PaseriError`:

```typescript ignore
import { parseGreeting } from './greeting.ts';

const greeting = parseGreeting({ hello: 'world' });
console.log(`Hello ${greeting.hello}!`);
```

---

Part of the [Paseri workspace](https://github.com/vbudovski/paseri).
