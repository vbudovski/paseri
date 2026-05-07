/**
 * @module
 *
 * This module contains the core Paseri validator and schemas.
 *
 * @example Basic usage
 *
 * ```typescript
 * import * as p from '@vbudovski/paseri';
 *
 * const schema = p.object({
 *     hello: p.string(),
 * });
 *
 * const data = { hello: 'world' };
 * const result = schema.safeParse(data);
 * if (result.ok) {
 *     console.log(`Hello ${result.value.hello}!`);
 * } else {
 *     throw new Error('issues parsing data.');
 * }
 * ```
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
