import { type LeafNode, issueCodes } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class NeverSchema extends Schema<never> {
    readonly issues: Record<string, LeafNode> = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'never' },
    } as const;

    protected _clone(): NeverSchema {
        return new NeverSchema();
    }
    _parse(value: unknown): InternalParseResult<never> {
        return this.issues.INVALID_TYPE;
    }
}

const singleton = new NeverSchema();

function never(): NeverSchema {
    return singleton;
}

export { never };
