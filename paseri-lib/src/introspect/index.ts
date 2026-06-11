/**
 * Schema introspection for [Paseri](https://paseri.dev): serialise any schema to a structured intermediate
 * representation ({@link IRGraph}) for tooling such as paseri-compiler.
 *
 * This is a side-effect subpath. Importing it installs working `toIR()` implementations on every Paseri schema's
 * prototype; before it is imported, the base `Schema` class only declares `toIR()` as a runtime-attached field and
 * calling it fails with `toIR is not a function`.
 *
 * @example Serialise a schema to its intermediate representation
 *
 * ```typescript
 * import * as p from '@paseri/paseri';
 * import '@paseri/paseri/introspect';
 *
 * const schema = p.object({ hello: p.string() });
 * const graph = schema.toIR();
 *
 * console.log(graph.entry.kind); // 'object'
 * ```
 *
 * @module
 */

import { Schema } from '../schemas/schema.ts';
import './_callsite.ts';
import './array.ts';
import './bigint.ts';
import './boolean.ts';
import './chain.ts';
import './date.ts';
import './default.ts';
import './duration.ts';
import './enum.ts';
import './instant.ts';
import './lazy.ts';
import './literal.ts';
import './map.ts';
import './never.ts';
import './null.ts';
import './nullable.ts';
import './number.ts';
import './object.ts';
import './optional.ts';
import './plainDate.ts';
import './plainDateTime.ts';
import './plainMonthDay.ts';
import './plainTime.ts';
import './plainYearMonth.ts';
import './record.ts';
import './refine.ts';
import './set.ts';
import './string.ts';
import './symbol.ts';
import './tuple.ts';
import './undefined.ts';
import './union.ts';
import './unknown.ts';
import './zonedDateTime.ts';
import type { IRContext, IRGraph } from './ir.ts';

Schema.prototype.toIR = function (): IRGraph {
    const context: IRContext = {
        visited: new WeakMap(),
        named: {},
        emitting: new Set(),
        cycles: new Set(),
        nextId: 0,
    };
    const entry = this._emit(context);
    return { entry, named: context.named, cycles: [...context.cycles].sort() };
};

export type {
    BigIntCheck,
    IR,
    IRGraph,
    LengthCheck,
    NumberCheck,
    ObjectMode,
    SerializedCallback,
    SizeCheck,
    StringCheck,
    TemporalCheck,
} from './ir.ts';
