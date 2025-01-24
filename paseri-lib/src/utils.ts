import type { Primitive } from 'type-fest';

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return !(
        typeof value !== 'object' ||
        value === null ||
        Array.isArray(value) ||
        value instanceof Promise ||
        value instanceof Map ||
        value instanceof Set ||
        value instanceof Date
    );
}

function primitiveToString(value: Primitive): string {
    if (typeof value === 'bigint') {
        return `${value}n`;
    }

    if (typeof value === 'string') {
        return `'${value}'`;
    }

    if (typeof value === 'symbol') {
        return value.description === 'undefined' ? 'Symbol()' : `Symbol('${value.description}')`;
    }

    return String(value);
}

export { isPlainObject, primitiveToString };
