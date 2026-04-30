import { issueCodes, type TreeNode } from '../issue.ts';
import type { Check } from '../schemas/schema.ts';
import { TAG_MAX_DATE, TAG_MIN_DATE } from './tags.ts';

function minDate(bound: Date): Check {
    if (Number.isNaN(bound.getTime())) {
        throw new Error('Invalid Date is not a valid boundary value.');
    }

    return { tag: TAG_MIN_DATE, param: bound, issue: { type: 'leaf', code: issueCodes.TOO_DATED } as TreeNode };
}

function maxDate(bound: Date): Check {
    if (Number.isNaN(bound.getTime())) {
        throw new Error('Invalid Date is not a valid boundary value.');
    }

    return { tag: TAG_MAX_DATE, param: bound, issue: { type: 'leaf', code: issueCodes.TOO_RECENT } as TreeNode };
}

export { maxDate, minDate };
