import { issueCodes, type TreeNode } from '../issue.ts';
import type { Check } from '../schemas/schema.ts';
import { TAG_MAX_LENGTH, TAG_MIN_LENGTH } from './tags.ts';

function minLength(bound: number): Check {
    if (Number.isNaN(bound)) {
        throw new Error('NaN is not a valid length.');
    }

    return { tag: TAG_MIN_LENGTH, param: bound, issue: { type: 'leaf', code: issueCodes.TOO_SHORT } as TreeNode };
}

function maxLength(bound: number): Check {
    if (Number.isNaN(bound)) {
        throw new Error('NaN is not a valid length.');
    }

    return { tag: TAG_MAX_LENGTH, param: bound, issue: { type: 'leaf', code: issueCodes.TOO_LONG } as TreeNode };
}

export { maxLength, minLength };
