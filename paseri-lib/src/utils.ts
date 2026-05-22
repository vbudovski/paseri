import type { Primitive } from 'type-fest';

function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }

    if (value.constructor === undefined) {
        return Object.getPrototypeOf(value) === null;
    }

    if (value.constructor !== Object && !Object.hasOwn(value, 'constructor')) {
        return false;
    }

    return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
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

export { deepFreeze, isPlainObject, primitiveToString };
