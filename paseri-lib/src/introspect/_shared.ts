// Internal types and helpers shared across the per-schema introspect modules.

import type { LengthCheck, SizeCheck } from './ir.ts';

interface RawCheck<ValueType = unknown> {
    tag: number;
    param: ValueType;
    issue: { code: string };
}

interface WithChecks<ValueType = unknown> {
    _checks?: readonly RawCheck<ValueType>[] | undefined;
}

function convertChecks<T, C>(checks: readonly T[] | undefined, toCheck: (check: T) => C): readonly C[] {
    return checks?.map(toCheck) ?? [];
}

function lengthChecks(minLength: number, maxLength: number): readonly LengthCheck[] {
    const result: LengthCheck[] = [];
    if (minLength > 0) {
        result.push({ name: 'min', value: minLength });
    }
    if (Number.isFinite(maxLength)) {
        result.push({ name: 'max', value: maxLength });
    }
    return result;
}

function sizeChecks(minSize: number, maxSize: number): readonly SizeCheck[] {
    const result: SizeCheck[] = [];
    if (minSize > 0) {
        result.push({ name: 'min', value: minSize });
    }
    if (Number.isFinite(maxSize)) {
        result.push({ name: 'max', value: maxSize });
    }
    return result;
}

export { convertChecks, lengthChecks, type RawCheck, sizeChecks, type WithChecks };
