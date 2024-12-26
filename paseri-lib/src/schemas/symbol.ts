import { type LeafNode, issueCodes } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class SymbolSchema extends Schema<symbol> {
    readonly issues: Record<string, LeafNode> = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'Symbol' },
    } as const;

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

const singleton = new SymbolSchema();

const symbol = /* @__PURE__ */ (): SymbolSchema => singleton;

export { symbol };
