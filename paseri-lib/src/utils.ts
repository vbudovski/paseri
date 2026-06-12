import type { Primitive } from 'type-fest';

function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }

    // Fast-accept the common plain object literal without the reflective `Object.getPrototypeOf` call. Reading
    // `constructor` first also primes V8's hidden-class check — proto-first orderings hit an inlining cliff. This
    // accepts any object whose `constructor` chains to `Object` (e.g. `Object.create({...})`); such objects cannot
    // arise from serialised/external input, only deliberate in-process prototype manipulation.
    if (value.constructor === Object) {
        return true;
    }

    if (value.constructor === undefined) {
        return Object.getPrototypeOf(value) === null;
    }

    if (value.constructor !== Object && !Object.hasOwn(value, 'constructor')) {
        return false;
    }

    return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
}

/**
 * Creates an own `__proto__` data property. In Annex B environments (browsers, Node.js — not Deno, which
 * removes the accessor) a bare `target['__proto__'] = value` invokes the inherited Object.prototype setter
 * and mutates the prototype instead of creating the key. Callers guard with `key === '__proto__'` inline
 * so the hot store sites stay plain assignments.
 */
function defineProtoProperty(target: Record<PropertyKey, unknown>, value: unknown): void {
    Object.defineProperty(target, '__proto__', { value, writable: true, enumerable: true, configurable: true });
}

function primitiveToString(value: Primitive): string {
    if (typeof value === 'bigint') {
        return `${value}n`;
    }

    if (typeof value === 'string') {
        return `'${value}'`;
    }

    return String(value);
}

function deepFreeze<ValueType>(value: ValueType): ValueType {
    if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
        return value;
    }

    Object.freeze(value);
    for (const key of Reflect.ownKeys(value)) {
        deepFreeze((value as Record<PropertyKey, unknown>)[key]);
    }
    return value;
}

export { deepFreeze, defineProtoProperty, isPlainObject, primitiveToString };
