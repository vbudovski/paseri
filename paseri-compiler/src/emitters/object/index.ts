import type ts from 'typescript';
import { modifies } from '../../can-modify.ts';
import type { Sink, State } from '../../state.ts';
import { type ObjectIR, shadowsPrototype } from './common.ts';
import { emitObjectFastPath } from './fast-path.ts';
import { tryEmitOutlinedObject } from './outline.ts';
import { tryEmitShapeEntryBody } from './shape-entry.ts';
import { emitObjectSlowPath } from './slow-path.ts';

/**
 * Emits object validation. A nested non-modifying object (accumulate sink, no output slot) is outlined into a
 * hoisted issues-helper so emitted function bodies stay below V8's optimise-size gate (see `outline.ts`); a
 * modifying one needs the slot wiring only the inline form provides, and a function-boundary object (return sink)
 * IS the body, so both emit inline.
 */
function emitObject(ir: ObjectIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    if (sink.kind === 'accumulate' && sink.outputSlot === undefined && !modifies(ir, state)) {
        const outlined = tryEmitOutlinedObject(ir, valueExpression, sink, state);
        if (outlined !== undefined) {
            return outlined;
        }
    }
    return emitObjectInline(ir, valueExpression, sink, state);
}

/**
 * Dispatches between two object emit shapes:
 * - Fast path: when no field can modify its value AND no field name collides
 *   with Object.prototype (so the `in` operator is safe).
 * - Slow path: anything else (modifying fields, or prototype-name collisions).
 *   Strip/strict bookkeeping is handled by the fast path too.
 */
function emitObjectInline(ir: ObjectIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const fields = Object.entries(ir.fields);
    const anyFieldModifies = fields.some(([, fieldIR]) => modifies(fieldIR, state));
    const anyFieldShadowsPrototype = fields.some(([name]) => shadowsPrototype(name));
    if (!anyFieldModifies && !anyFieldShadowsPrototype) {
        return emitObjectFastPath(ir, valueExpression, sink, state);
    }
    return emitObjectSlowPath(ir, valueExpression, sink, state);
}

export { emitObject, emitObjectInline, tryEmitShapeEntryBody };
