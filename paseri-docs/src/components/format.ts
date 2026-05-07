function formatResult(value: unknown): string {
    if (typeof value === 'bigint') {
        return `${value}n`;
    }

    if (typeof value === 'string') {
        return `'${value}'`;
    }

    if (typeof value === 'undefined') {
        return 'undefined';
    }

    if (typeof value === 'symbol') {
        return value.description === 'undefined' ? 'Symbol()' : `Symbol('${value.description}')`;
    }

    if (value instanceof Date) {
        return `Date ${String(value)}`;
    }

    if (value === null) {
        return 'null';
    }

    if (value instanceof Temporal.Instant) {
        return `Temporal.Instant ${value.toString()}`;
    }

    if (value instanceof Temporal.ZonedDateTime) {
        return `Temporal.ZonedDateTime ${value.toString()}`;
    }

    if (value instanceof Temporal.PlainDateTime) {
        return `Temporal.PlainDateTime ${value.toString()}`;
    }

    if (value instanceof Temporal.PlainDate) {
        return `Temporal.PlainDate ${value.toString()}`;
    }

    if (value instanceof Temporal.PlainTime) {
        return `Temporal.PlainTime ${value.toString()}`;
    }

    if (value instanceof Temporal.PlainYearMonth) {
        return `Temporal.PlainYearMonth ${value.toString()}`;
    }

    if (value instanceof Temporal.PlainMonthDay) {
        return `Temporal.PlainMonthDay ${value.toString()}`;
    }

    if (value instanceof Temporal.Duration) {
        return `Temporal.Duration ${value.toString()}`;
    }

    if (Array.isArray(value)) {
        return `[${value.map((v) => formatResult(v)).join(', ')}]`;
    }

    if (value instanceof Set) {
        return `Set(${value.size}) {${value
            .keys()
            .map((k) => formatResult(k))
            .toArray()
            .join(', ')}}`;
    }

    if (value instanceof Map) {
        return `Map(${value.size}) {${value
            .entries()
            .map(([k, v]) => `${formatResult(k)} => ${formatResult(v)}`)
            .toArray()
            .join(', ')}}`;
    }

    if (typeof value === 'object') {
        return `{${Object.entries(value)
            .map(([k, v]) => `${k}: ${formatResult(v)}`)
            .join(', ')}}`;
    }

    return JSON.stringify(value);
}

export { formatResult };
