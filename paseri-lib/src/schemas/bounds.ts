// Shared construction-time bound bookkeeping for the ordered numeric schemas (number, bigint). Both hold
// their range constraints as a flat list of gte/gt/lte/lt checks; these helpers derive the binding
// lower/upper bound from that list and reject contradictory pairs when a new bound is added.
//
// Contradictory bounds reject every input, so a lower bound that can't be satisfied alongside the existing
// upper bound (or vice versa) is a construction error. "Empty over the reals": `gt(5).lt(5)` and
// `gte(5).lt(5)` throw; `gte(5).lte(5)` (the single value 5) is fine. The integer-only gap
// (`gt(5).lt(6).int()`) is intentionally not caught — that's a bounds×integrality interaction, not a
// contradiction over the reals.
//
// `undefined` — never a valid bound for either type — is the "no bound set" sentinel. number must not use
// ±Infinity for this: ±Infinity are valid number inputs and therefore valid bounds, so a ±Infinity sentinel
// makes a bound sitting at ±Infinity invisible to the guard, silently building a reject-everything schema
// (e.g. `gte(-Infinity).lt(-Infinity)`) instead of throwing.

interface OrderedCheck<ParamType> {
    tag: number;
    param: ParamType;
}

interface EffectiveBound<ParamType> {
    value: ParamType;
    strict: boolean;
}

// Binding lower bound across repeated gte/gt: the largest, marked strict when a `gt` sits at that value.
function effectiveLowerBound<ParamType extends number | bigint>(
    checks: readonly OrderedCheck<ParamType>[] | undefined,
    gteTag: number,
    gtTag: number,
): EffectiveBound<ParamType> | undefined {
    if (checks === undefined) {
        return undefined;
    }
    let value: ParamType | undefined;
    for (const check of checks) {
        if ((check.tag === gteTag || check.tag === gtTag) && (value === undefined || check.param > value)) {
            value = check.param;
        }
    }
    if (value === undefined) {
        return undefined;
    }
    let strict = false;
    for (const check of checks) {
        if (check.tag === gtTag && check.param === value) {
            strict = true;
        }
    }

    return { value, strict };
}

// Binding upper bound across repeated lte/lt: the smallest, marked strict when a `lt` sits at that value.
function effectiveUpperBound<ParamType extends number | bigint>(
    checks: readonly OrderedCheck<ParamType>[] | undefined,
    lteTag: number,
    ltTag: number,
): EffectiveBound<ParamType> | undefined {
    if (checks === undefined) {
        return undefined;
    }
    let value: ParamType | undefined;
    for (const check of checks) {
        if ((check.tag === lteTag || check.tag === ltTag) && (value === undefined || check.param < value)) {
            value = check.param;
        }
    }
    if (value === undefined) {
        return undefined;
    }
    let strict = false;
    for (const check of checks) {
        if (check.tag === ltTag && check.param === value) {
            strict = true;
        }
    }

    return { value, strict };
}

function assertLowerWithinUpper<ParamType extends number | bigint>(
    upper: EffectiveBound<ParamType> | undefined,
    value: ParamType,
    strict: boolean,
): void {
    if (upper !== undefined && (value > upper.value || (value === upper.value && (strict || upper.strict)))) {
        throw new Error('Lower bound must not exceed upper bound.');
    }
}

function assertUpperWithinLower<ParamType extends number | bigint>(
    lower: EffectiveBound<ParamType> | undefined,
    value: ParamType,
    strict: boolean,
): void {
    if (lower !== undefined && (value < lower.value || (value === lower.value && (strict || lower.strict)))) {
        throw new Error('Lower bound must not exceed upper bound.');
    }
}

export type { EffectiveBound, OrderedCheck };
export { assertLowerWithinUpper, assertUpperWithinLower, effectiveLowerBound, effectiveUpperBound };
