import { type LeafNode, issueCodes } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class UndefinedSchema extends Schema<undefined> {
    readonly issues: Record<string, LeafNode> = {
        INVALID_VALUE: { type: 'leaf', code: issueCodes.INVALID_VALUE, expected: 'undefined' },
    } as const;

    protected _clone(): UndefinedSchema {
        return new UndefinedSchema();
    }
    _parse(value: unknown): InternalParseResult<undefined> {
        if (value !== undefined) {
            return this.issues.INVALID_VALUE;
        }

        return undefined;
    }
}

const singleton = new UndefinedSchema();

// `undefined` is a reserved word.
function undefined_(): UndefinedSchema {
    return singleton;
}

export { undefined_ };
