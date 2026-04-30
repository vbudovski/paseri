import { issueCodes, type TreeNode } from '../issue.ts';
import {
    dateRegex,
    datetimeRegex,
    emailRegex,
    emojiRegex,
    ipCidrRegex,
    ipRegex,
    nanoidRegex,
    timeRegex,
    uuidRegex,
} from '../schemas/regex.gen.ts';
import type { Check } from '../schemas/schema.ts';
import { TAG_ENDS_WITH, TAG_INCLUDES, TAG_REGEX, TAG_STARTS_WITH } from './tags.ts';

function email(): Check {
    return { tag: TAG_REGEX, param: emailRegex(), issue: { type: 'leaf', code: issueCodes.INVALID_EMAIL } as TreeNode };
}

function emoji(): Check {
    return { tag: TAG_REGEX, param: emojiRegex(), issue: { type: 'leaf', code: issueCodes.INVALID_EMOJI } as TreeNode };
}

function uuid(): Check {
    return { tag: TAG_REGEX, param: uuidRegex(), issue: { type: 'leaf', code: issueCodes.INVALID_UUID } as TreeNode };
}

function nanoid(): Check {
    return {
        tag: TAG_REGEX,
        param: nanoidRegex(),
        issue: { type: 'leaf', code: issueCodes.INVALID_NANOID } as TreeNode,
    };
}

function includes(searchString: string): Check {
    return {
        tag: TAG_INCLUDES,
        param: searchString,
        issue: { type: 'leaf', code: issueCodes.DOES_NOT_INCLUDE } as TreeNode,
    };
}

function startsWith(searchString: string): Check {
    return {
        tag: TAG_STARTS_WITH,
        param: searchString,
        issue: { type: 'leaf', code: issueCodes.DOES_NOT_START_WITH } as TreeNode,
    };
}

function endsWith(searchString: string): Check {
    return {
        tag: TAG_ENDS_WITH,
        param: searchString,
        issue: { type: 'leaf', code: issueCodes.DOES_NOT_END_WITH } as TreeNode,
    };
}

function isoDate(): Check {
    return {
        tag: TAG_REGEX,
        param: dateRegex(),
        issue: { type: 'leaf', code: issueCodes.INVALID_DATE_STRING } as TreeNode,
    };
}

function isoTime(options: { precision?: number } = {}): Check {
    if (options.precision !== undefined && (!Number.isInteger(options.precision) || options.precision < 0)) {
        throw new Error('Precision must be a non-negative integer.');
    }

    return {
        tag: TAG_REGEX,
        param: timeRegex(options.precision),
        issue: { type: 'leaf', code: issueCodes.INVALID_TIME_STRING } as TreeNode,
    };
}

function isoDatetime(options: { precision?: number; offset?: boolean; local?: boolean } = {}): Check {
    if (options.precision !== undefined && (!Number.isInteger(options.precision) || options.precision < 0)) {
        throw new Error('Precision must be a non-negative integer.');
    }

    return {
        tag: TAG_REGEX,
        param: datetimeRegex(options.precision, options.offset, options.local),
        issue: { type: 'leaf', code: issueCodes.INVALID_DATE_TIME_STRING } as TreeNode,
    };
}

function ip(options: { version?: 4 | 6 } = {}): Check {
    return {
        tag: TAG_REGEX,
        param: ipRegex(options.version),
        issue: { type: 'leaf', code: issueCodes.INVALID_IP_ADDRESS } as TreeNode,
    };
}

function cidr(options: { version?: 4 | 6 } = {}): Check {
    return {
        tag: TAG_REGEX,
        param: ipCidrRegex(options.version),
        issue: { type: 'leaf', code: issueCodes.INVALID_IP_ADDRESS_RANGE } as TreeNode,
    };
}

function regex(pattern: RegExp): Check {
    return {
        tag: TAG_REGEX,
        param: pattern,
        issue: { type: 'leaf', code: issueCodes.DOES_NOT_MATCH_REGEX } as TreeNode,
    };
}

export {
    cidr,
    dateRegex,
    datetimeRegex,
    email,
    emailRegex,
    emoji,
    emojiRegex,
    endsWith,
    includes,
    ip,
    ipCidrRegex,
    ipRegex,
    isoDate,
    isoDatetime,
    isoTime,
    nanoid,
    nanoidRegex,
    regex,
    startsWith,
    timeRegex,
    uuid,
    uuidRegex,
};
