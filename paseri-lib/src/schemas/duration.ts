import { issueCodes, type LeafNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class DurationSchema extends Schema<Temporal.Duration> {
    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Temporal.Duration' },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): DurationSchema {
        return new DurationSchema();
    }
    _parse(value: unknown): InternalParseResult<Temporal.Duration> {
        if (!(value instanceof Temporal.Duration)) {
            return this.issues.INVALID_TYPE;
        }

        return undefined;
    }
}

const singleton = /* @__PURE__ */ new DurationSchema();

/**
 * [Duration](https://paseri.dev/reference/schema/primitives/duration/) schema.
 */
const duration = /* @__PURE__ */ (): DurationSchema => singleton;

export { duration };
