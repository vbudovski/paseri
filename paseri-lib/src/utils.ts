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

    if (!Object.hasOwn(value, 'constructor')) {
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

/**
 * True when adding the order bound `value` would contradict an existing opposite bound in `checks` (matched by
 * `oppositeTag`). `compare` orders two bound params like `Temporal.PlainDate.compare`; `side` is `1` for a new lower
 * bound (contradiction if it sits above an upper bound) and `-1` for a new upper bound (below a lower bound). Equal
 * bounds (`min === max`) stay valid — only a strict overshoot counts.
 */
function boundsContradict<ParamType>(
    checks: ReadonlyArray<{ tag: number; param: ParamType }> | undefined,
    oppositeTag: number,
    value: ParamType,
    compare: (left: ParamType, right: ParamType) => number,
    side: 1 | -1,
): boolean {
    if (checks === undefined) {
        return false;
    }
    for (const check of checks) {
        if (check.tag === oppositeTag && Math.sign(compare(value, check.param)) === side) {
            return true;
        }
    }

    return false;
}

function isTemporalInstance(value: object): boolean {
    if (typeof Temporal === 'undefined') {
        return false;
    }
    return (
        value instanceof Temporal.Instant ||
        value instanceof Temporal.PlainDate ||
        value instanceof Temporal.PlainDateTime ||
        value instanceof Temporal.PlainMonthDay ||
        value instanceof Temporal.PlainTime ||
        value instanceof Temporal.PlainYearMonth ||
        value instanceof Temporal.ZonedDateTime ||
        value instanceof Temporal.Duration
    );
}

/**
 * Deep-clones a `.default()` value so the stored copy is detached from the caller's reference. Unlike
 * `structuredClone`, Temporal instances are treated as immutable leaves — they can't be `structuredClone`d and
 * need no copy — while containers are cloned recursively so a nested Temporal survives. Remaining leaf types
 * (`Date`, `RegExp`, typed arrays, …) fall back to `structuredClone`.
 */
function deepClone<ValueType>(value: ValueType): ValueType {
    if (value === null || typeof value !== 'object') {
        return value;
    }
    if (isTemporalInstance(value)) {
        return value;
    }
    if (Array.isArray(value)) {
        return (value as unknown[]).map((item) => deepClone(item)) as ValueType;
    }
    if (value instanceof Map) {
        const cloned = new Map<unknown, unknown>();
        for (const [key, inner] of value as Map<unknown, unknown>) {
            cloned.set(deepClone(key), deepClone(inner));
        }
        return cloned as ValueType;
    }
    if (value instanceof Set) {
        const cloned = new Set<unknown>();
        for (const item of value as Set<unknown>) {
            cloned.add(deepClone(item));
        }
        return cloned as ValueType;
    }
    if (isPlainObject(value)) {
        const source = value as Record<PropertyKey, unknown>;
        const cloned: Record<PropertyKey, unknown> = {};
        for (const key of Object.keys(source)) {
            if (key === '__proto__') {
                defineProtoProperty(cloned, deepClone(source[key]));
            } else {
                cloned[key] = deepClone(source[key]);
            }
        }
        return cloned as ValueType;
    }
    return structuredClone(value);
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

export { boundsContradict, deepClone, deepFreeze, defineProtoProperty, isPlainObject, primitiveToString };
