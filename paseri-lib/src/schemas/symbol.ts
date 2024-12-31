import { type LeafNode, issueCodes } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class SymbolSchema extends Schema<symbol> {
    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Symbol' },
    } as const satisfies Record<string, LeafNode>;

    protected _clone(): SymbolSchema {
        return new SymbolSchema();
    }
    _parse(value: unknown): InternalParseResult<symbol> {
        if (typeof value !== 'symbol') {
            return this.issues.INVALID_TYPE;
        }

        return undefined;
    }
}

const singleton = /* @__PURE__ */ new SymbolSchema();

/**
 * [Symbol](https://paseri.dev/reference/schema/primitives/symbol/) schema.
 */
const symbol = /* @__PURE__ */ (): SymbolSchema => singleton;

export { symbol };
