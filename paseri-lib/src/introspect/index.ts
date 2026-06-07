// Side-effect subpath. Importing this module installs working `toIR()` and `_emit()` implementations on every Paseri
// schema's prototype; before this subpath is imported, the base `Schema` class only declares them as runtime-attached
// fields and calling either fails with `<name> is not a function`. The per-class `_emit` augmentations that `toIR()`
// dispatches into live in the sibling files below.

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
        nextId: 0,
    };
    return { entry: this._emit(context), named: context.named };
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
