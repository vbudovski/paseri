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

export { maxDate, minDate } from './checks/date.ts';
export { maxLength, minLength } from './checks/length.ts';
export { finite, gt, gte, int, lt, lte, safeInt } from './checks/number.ts';
export { maxSize, minSize } from './checks/size.ts';
export {
    cidr,
    email,
    emoji,
    endsWith,
    includes,
    ip,
    isoDate,
    isoDatetime,
    isoTime,
    nanoid,
    regex,
    startsWith,
    uuid,
} from './checks/string.ts';
export type { Infer } from './infer.ts';
export { err, ok, PaseriError } from './result.ts';
export {
    array,
    bigint,
    boolean,
    chain,
    date,
    lazy,
    literal,
    map,
    never,
    null_ as null,
    nullable,
    number,
    object,
    optional,
    record,
    Schema,
    set,
    string,
    symbol,
    tuple,
    undefined_ as undefined,
    union,
    unknown,
} from './schemas/index.ts';
export type { Check } from './schemas/schema.ts';
