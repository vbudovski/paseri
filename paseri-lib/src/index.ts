/**
 * This module contains the core Paseri validator and schemas.
 * @module
 */

export {
    array,
    bigint,
    boolean,
    lazy,
    literal,
    map,
    never,
    null_ as null,
    number,
    object,
    record,
    set,
    string,
    symbol,
    tuple,
    undefined_ as undefined,
    union,
    unknown,
    Schema,
} from './schemas/index.ts';
export { ok, err, PaseriError } from './result.ts';

export type { Infer } from './infer.ts';
