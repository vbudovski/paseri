---
"@paseri/paseri": patch
---

Fixed the Standard Schema input type. `StandardSchemaV1.InferInput` on a Paseri schema previously reported the output type instead of `unknown` — backwards for transforming schemas (a `string`→`number` chain inferred its input as `number`). It now infers `unknown` input (matching `safeParse`), with `InferOutput` the parsed type.
