/**
 * Ahead-of-time compiler for [Paseri](https://jsr.io/@paseri/paseri) schemas.
 *
 * Given a Paseri schema, {@linkcode toSource} emits a TypeScript module containing the parser, for faster
 * validation. Import `@paseri/paseri/introspect`, then pass `schema.toIR()` to it. The generated module
 * exports a single object named after the schema, with `.safeParse` / `.parse` methods matching paseri-lib's
 * runtime schema plus a [Standard Schema](https://standardschema.dev) `['~standard']`, so it is a drop-in
 * replacement for the runtime schema.
 *
 * @example Compile a schema to a TypeScript module
 * ```ts
 * import * as p from '@paseri/paseri';
 * import '@paseri/paseri/introspect';
 * import { toSource } from '@paseri/compiler';
 *
 * const schema = p.object({ hello: p.string() });
 * const source = toSource(schema.toIR(), { name: 'Greeting' });
 * // Write `source` to a file (e.g. `greeting.ts`) as part of your build.
 * ```
 *
 * @module
 */

export { type ToSourceOptions, toSource } from './toSource.ts';
