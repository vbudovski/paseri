import { issueCodes, type LeafNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class PlainMonthDaySchema extends Schema<Temporal.PlainMonthDay> {
    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Temporal.PlainMonthDay' },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): PlainMonthDaySchema {
        return new PlainMonthDaySchema();
    }
    _parse(value: unknown): InternalParseResult<Temporal.PlainMonthDay> {
        if (!(value instanceof Temporal.PlainMonthDay)) {
            return this.issues.INVALID_TYPE;
        }

        return undefined;
    }
}

const singleton = /* @__PURE__ */ new PlainMonthDaySchema();

/**
 * [PlainMonthDay](https://paseri.dev/reference/schema/primitives/plain-month-day/) schema.
 */
const plainMonthDay = /* @__PURE__ */ (): PlainMonthDaySchema => singleton;

export { plainMonthDay };
