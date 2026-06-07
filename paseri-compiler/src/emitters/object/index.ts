import type ts from 'typescript';
import { modifies } from '../../can-modify.ts';
import type { Sink, State } from '../../state.ts';
import { type ObjectIR, shadowsPrototype } from './common.ts';
import { emitObjectFastPath } from './fast-path.ts';
import { tryEmitShapeEntryBody } from './shape-entry.ts';
import { emitObjectSlowPath } from './slow-path.ts';

/**
 * Dispatches between two object emit shapes:
 * - Fast path: when no field can modify its value AND no field name collides
 *   with Object.prototype (so the `in` operator is safe).
 * - Slow path: anything else (modifying fields, or prototype-name collisions).
 *   Strip/strict bookkeeping is handled by the fast path too.
 */
function emitObject(ir: ObjectIR, valueExpression: ts.Expression, sink: Sink, state: State): ts.Statement[] {
    const fields = Object.entries(ir.fields);
    const anyFieldModifies = fields.some(([, fieldIR]) => modifies(fieldIR, state));
    const anyFieldShadowsPrototype = fields.some(([name]) => shadowsPrototype(name));
    if (!anyFieldModifies && !anyFieldShadowsPrototype) {
        return emitObjectFastPath(ir, valueExpression, sink, state);
    }
    return emitObjectSlowPath(ir, valueExpression, sink, state);
}

export { emitObject, tryEmitShapeEntryBody };
