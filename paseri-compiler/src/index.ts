/**
 * Ahead-of-time compiler for [Paseri](https://jsr.io/@vbudovski/paseri) schemas.
 *
 * Given a Paseri schema, {@linkcode toSource} emits a TypeScript module containing the parser, for faster
 * validation. Import `@vbudovski/paseri/introspect`, then pass `schema.toIR()` to it. The generated module
 * exports a `safeParse<Name>` validator matching paseri-lib's runtime `safeParse` shape, plus a throwing
 * `parse<Name>` counterpart.
 *
 * @example Compile a schema to a TypeScript module
 * ```ts
 * import * as p from '@vbudovski/paseri';
 * import '@vbudovski/paseri/introspect';
 * import { toSource } from '@vbudovski/paseri-compiler';
 *
 * const schema = p.object({ hello: p.string() });
 * const source = toSource(schema.toIR(), { name: 'Greeting' });
 * // Write `source` to a file (e.g. `greeting.ts`) as part of your build.
 * ```
 *
 * @module
 */

export { type ToSourceOptions, toSource } from './toSource.ts';
