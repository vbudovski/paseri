import { issueCodes, type TreeNode } from '../issue.ts';
import type { Check } from '../schemas/schema.ts';
import { TAG_MAX_SIZE, TAG_MIN_SIZE } from './tags.ts';

function minSize(bound: number): Check {
    if (Number.isNaN(bound)) {
        throw new Error('NaN is not a valid size.');
    }

    return { tag: TAG_MIN_SIZE, param: bound, issue: { type: 'leaf', code: issueCodes.TOO_SHORT } as TreeNode };
}

function maxSize(bound: number): Check {
    if (Number.isNaN(bound)) {
        throw new Error('NaN is not a valid size.');
    }

    return { tag: TAG_MAX_SIZE, param: bound, issue: { type: 'leaf', code: issueCodes.TOO_LONG } as TreeNode };
}

export { maxSize, minSize };
