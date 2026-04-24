import { issueCodes, type TreeNode } from '../issue.ts';
import type { Check } from '../schemas/schema.ts';
import { TAG_FINITE, TAG_GT, TAG_GTE, TAG_INT, TAG_LT, TAG_LTE, TAG_SAFE_INT } from './tags.ts';

function gte(bound: number): Check;
function gte(bound: bigint): Check;
function gte(bound: number | bigint): Check {
    if (typeof bound === 'number' && Number.isNaN(bound)) {
        throw new Error('NaN is not a valid boundary value.');
    }

    return { tag: TAG_GTE, param: bound, issue: { type: 'leaf', code: issueCodes.TOO_SMALL } as TreeNode };
}

function gt(bound: number): Check;
function gt(bound: bigint): Check;
function gt(bound: number | bigint): Check {
    if (typeof bound === 'number' && Number.isNaN(bound)) {
        throw new Error('NaN is not a valid boundary value.');
    }

    return { tag: TAG_GT, param: bound, issue: { type: 'leaf', code: issueCodes.TOO_SMALL } as TreeNode };
}

function lte(bound: number): Check;
function lte(bound: bigint): Check;
function lte(bound: number | bigint): Check {
    if (typeof bound === 'number' && Number.isNaN(bound)) {
        throw new Error('NaN is not a valid boundary value.');
    }

    return { tag: TAG_LTE, param: bound, issue: { type: 'leaf', code: issueCodes.TOO_LARGE } as TreeNode };
}

function lt(bound: number): Check;
function lt(bound: bigint): Check;
function lt(bound: number | bigint): Check {
    if (typeof bound === 'number' && Number.isNaN(bound)) {
        throw new Error('NaN is not a valid boundary value.');
    }

    return { tag: TAG_LT, param: bound, issue: { type: 'leaf', code: issueCodes.TOO_LARGE } as TreeNode };
}

function int(): Check {
    return { tag: TAG_INT, param: 0, issue: { type: 'leaf', code: issueCodes.INVALID_INTEGER } as TreeNode };
}

function finite(): Check {
    return { tag: TAG_FINITE, param: 0, issue: { type: 'leaf', code: issueCodes.INVALID_FINITE } as TreeNode };
}

function safeInt(): Check {
    return { tag: TAG_SAFE_INT, param: 0, issue: { type: 'leaf', code: issueCodes.INVALID_SAFE_INTEGER } as TreeNode };
}

export { finite, gt, gte, int, lt, lte, safeInt };
