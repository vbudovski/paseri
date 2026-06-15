[![Coverage](https://gist.githubusercontent.com/vbudovski/80548a1b87f9f00fe1ae426ca6a2a517/raw/vbudovski_paseri-vite-plugin_main-coverage.svg)](https://github.com/vbudovski/paseri/actions/workflows/release.yml)
[![JSR](https://jsr.io/badges/@paseri/vite-plugin)](https://jsr.io/@paseri/vite-plugin)
[![JSR Score](https://jsr.io/badges/@paseri/vite-plugin/score)](https://jsr.io/@paseri/vite-plugin)

---

# Paseri Vite plugin

Vite plugin to compile [Paseri](https://github.com/vbudovski/paseri/blob/main/paseri-lib/README.md) schemas at build time. Simply write your schemas in `*.schema.ts` files, and they will be replaced with ahead-of-time compiled versions in production builds.

Requires Vite 7+.

## Installation

```shell
deno add jsr:@paseri/paseri jsr:@paseri/vite-plugin
```

```shell
bunx jsr add @paseri/paseri @paseri/vite-plugin
```

```shell
pnpm add jsr:@paseri/paseri jsr:@paseri/vite-plugin
```

```shell
yarn add jsr:@paseri/paseri jsr:@paseri/vite-plugin
```

```shell
npx jsr add @paseri/paseri @paseri/vite-plugin
```

## Usage

Register the plugin in your Vite config:

```typescript ignore
// vite.config.ts
import { paseri } from '@paseri/vite-plugin';

export default {
    plugins: [paseri()],
};
```

Write your schema in a `*.schema.ts` file:

```typescript ignore
// user.schema.ts
import * as p from '@paseri/paseri';

export const User = p.object({
    id: p.number().int(),
    name: p.string().min(1),
});
```

Use your schema as normal. When building your application, the runtime parser will be replaced with an ahead-of-time version.

```typescript ignore
// app.ts
import { User } from './user.schema.ts';

const result = User.safeParse(input);
```

---

Part of the [Paseri workspace](https://github.com/vbudovski/paseri).
