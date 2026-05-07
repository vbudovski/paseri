/**
 * Core validators and schemas for [Paseri](https://paseri.dev), a TypeScript
 * parsing and validation library for structured data.
 *
 * @example Validate input with `safeParse`
 *
 * ```typescript
 * import * as p from '@vbudovski/paseri';
 *
 * const schema = p.object({
 *     hello: p.string(),
 * });
 *
 * const result = schema.safeParse({ hello: 'world' });
 * if (result.ok) {
 *     console.log(`Hello ${result.value.hello}!`);
 * } else {
 *     console.error(result.messages());
 * }
 * ```
 *
 * @example Derive a TypeScript type from a schema
 *
 * ```typescript
 * import * as p from '@vbudovski/paseri';
 *
 * const User = p.object({
 *     name: p.string(),
 *     age: p.number(),
 * });
 *
 * type User = p.Infer<typeof User>;
 *
 * const alice: User = { name: 'Alice', age: 30 };
 * ```
 *
 * @example Validate input with `parse` (throws `PaseriError`)
 *
 * ```typescript
 * import * as p from '@vbudovski/paseri';
 *
 * const schema = p.object({
 *     hello: p.string(),
 * });
 *
 * try {
 *     const value = schema.parse({ hello: 'world' });
 *     console.log(`Hello ${value.hello}!`);
 * } catch (e) {
 *     if (e instanceof p.PaseriError) {
 *         console.error(e.messages());
 *     }
 * }
 * ```
 *
 * @module
 */

export type { Infer } from './infer.ts';
export { err, ok, PaseriError } from './result.ts';
export {
    array,
    bigint,
    boolean,
    date,
    duration,
    instant,
    lazy,
    literal,
    map,
    never,
    null_ as null,
    number,
    object,
    plainDate,
    plainDateTime,
    plainMonthDay,
    plainTime,
    plainYearMonth,
    record,
    Schema,
    set,
    string,
    symbol,
    tuple,
    undefined_ as undefined,
    union,
    unknown,
    zonedDateTime,
} from './schemas/index.ts';
