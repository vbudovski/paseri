import type { IR, IRGraph } from '@vbudovski/paseri/introspect';
import type { State } from './state.ts';

type RefResolver = (name: string) => boolean;

/**
 * Analyse the IR for any nodes that could result in a modification, signalling a switch from the fast path to the
 * slower path with additional bookkeeping in container emitters. `resolveRef` decides whether a `ref` (lazy/recursive)
 * node can modify; it defaults to `true` (conservative) for callers without the resolved graph. Emitters should call
 * `modifies` instead, which supplies a graph-aware resolver so pure recursive schemas aren't needlessly demoted off
 * the fast path.
 */
function canModify(ir: IR, resolveRef: RefResolver = () => true): boolean {
    switch (ir.kind) {
        case 'default':
            return true;
        case 'ref':
            return resolveRef(ir.name);
        case 'object':
            return ir.mode === 'strip' || Object.values(ir.fields).some((field) => canModify(field, resolveRef));
        case 'array':
        case 'set':
        case 'record':
            return canModify(ir.element, resolveRef);
        case 'tuple':
            return ir.elements.some((element) => canModify(element, resolveRef));
        case 'map':
            return canModify(ir.key, resolveRef) || canModify(ir.value, resolveRef);
        case 'union':
            return ir.members.some((member) => canModify(member, resolveRef));
        case 'optional':
        case 'nullable':
        case 'refine':
            return canModify(ir.inner, resolveRef);
        case 'chain':
            return true;
        default:
            return false;
    }
}

/**
 * Whether `ir` can modify its value, resolving `ref` nodes against the graph-aware map precomputed in `state`. A ref
 * whose name isn't in the map falls back to `true` (conservative — wrong-true only emits unused bookkeeping, whereas
 * wrong-false would silently drop modifications).
 */
function modifies(ir: IR, state: State): boolean {
    return canModify(ir, (name) => state.namedCanModify.get(name) ?? true);
}

/**
 * Precomputes, per named (lazy/recursive) graph entry, whether it can modify its value. Uses a least-fixed-point
 * starting from "cannot modify" so a back-edge `ref` into a still-unresolved entry contributes `false`; the iteration
 * widens an entry to `true` only when a genuinely modifying construct is reachable. `canModify` is monotonic in the
 * assumed set, so the loop converges. A purely structural recursive schema therefore resolves to `false` and keeps
 * the object fast path.
 */
function computeNamedCanModify(graph: IRGraph): Map<string, boolean> {
    const result = new Map<string, boolean>();
    for (const name of Object.keys(graph.named)) {
        result.set(name, false);
    }
    let changed = true;
    while (changed) {
        changed = false;
        for (const [name, ir] of Object.entries(graph.named)) {
            const next = canModify(ir, (refName) => result.get(refName) ?? false);
            if (next !== result.get(name)) {
                result.set(name, next);
                changed = true;
            }
        }
    }
    return result;
}

export { canModify, computeNamedCanModify, modifies };
