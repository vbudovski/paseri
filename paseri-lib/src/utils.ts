import type { Primitive } from 'type-fest';

function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }

    if (value.constructor === undefined) {
        return true;
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

export { isPlainObject, primitiveToString };
