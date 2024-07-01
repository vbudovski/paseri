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

export { isPlainObject };
